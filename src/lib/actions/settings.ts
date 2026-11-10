"use server";

import { revalidatePath } from "next/cache";
import { assertAccessLevel } from "@/lib/auth-guards";
import { fail, ok, type ActionResult } from "@/lib/action";
import { isUuid } from "@/lib/pagination";
import { deleteMyAccount, getMyCredentialsUrl, saveProfessionalDetails, saveStudentSettings, setCredentialsPath, updateMyName, type NotificationPrefs } from "@/lib/data/settings";

function cleanName(value: string): string {
  const name = value.trim().replace(/\s+/g, " ");
  if (name.length < 1 || name.length > 100) throw new Error("Enter your name (1 to 100 characters).");
  return name;
}

export async function saveStudentSettingsAction(input: { name: string; bio: string; interestIds: string[]; prefs: NotificationPrefs }): Promise<ActionResult> {
  try {
    const me = await assertAccessLevel("student");
    const bio = input.bio.trim();
    if (bio.length > 1000) throw new Error("Your bio is limited to 1000 characters.");
    if (!Array.isArray(input.interestIds) || input.interestIds.length > 10 || !input.interestIds.every((i) => isUuid(i))) throw new Error("Choose up to 10 careers.");
    const prefs: NotificationPrefs = { messages: input.prefs.messages !== false, reminders: input.prefs.reminders !== false, peers: input.prefs.peers !== false };
    const name = cleanName(input.name);
    if (name !== me.name) await updateMyName(me.id, name);
    await saveStudentSettings({ bio, interestIds: input.interestIds, prefs });
    revalidatePath("/student", "layout");
    revalidatePath("/student/peers");
    return ok();
  } catch (e) {
    return fail(e);
  }
}

export async function saveProfessionalSettingsAction(input: { name: string; bio: string; experienceYears: number | null; careerId: string }): Promise<ActionResult> {
  try {
    const me = await assertAccessLevel("professional");
    const bio = input.bio.trim();
    if (bio.length > 2000) throw new Error("Your bio is limited to 2000 characters.");
    if (!isUuid(input.careerId)) throw new Error("Choose your career.");
    const years = input.experienceYears;
    if (years !== null && (!Number.isInteger(years) || years < 0 || years > 70)) throw new Error("Years of experience must be between 0 and 70.");
    const name = cleanName(input.name);
    if (name !== me.name) await updateMyName(me.id, name);
    await saveProfessionalDetails(me.id, { bio, experienceYears: years, careerId: input.careerId });
    revalidatePath("/pro", "layout");
    revalidatePath("/careers", "layout");
    return ok();
  } catch (e) {
    return fail(e);
  }
}

/** After the browser uploaded the file into "<my id>/...": attach it to my profile (rejected applications return to pending). */
export async function attachCredentialsAction(path: string): Promise<ActionResult> {
  try {
    const me = await assertAccessLevel("professional");
    if (typeof path !== "string" || !path.startsWith(`${me.id}/`) || path.includes("..") || path.length > 300) throw new Error("That file does not belong to you.");
    await setCredentialsPath(me.id, path);
    revalidatePath("/pro", "layout");
    revalidatePath("/admin/verification");
    return ok();
  } catch (e) {
    return fail(e);
  }
}

export async function openMyCredentialsAction(): Promise<ActionResult<{ url: string }>> {
  try {
    const me = await assertAccessLevel("professional");
    return ok({ url: await getMyCredentialsUrl(me.id) });
  } catch (e) {
    return fail(e);
  }
}

/** Deletes the signed-in student or professional (typed confirmation is checked here and again in the Edge Function). */
export async function deleteMyAccountAction(confirmation: string): Promise<ActionResult<{ mode: "hard" | "soft" }>> {
  try {
    await assertAccessLevel("student", "professional");
    if (confirmation.trim() !== "DELETE") throw new Error("Type DELETE to confirm.");
    const mode = await deleteMyAccount();
    return ok({ mode });
  } catch (e) {
    return fail(e);
  }
}
