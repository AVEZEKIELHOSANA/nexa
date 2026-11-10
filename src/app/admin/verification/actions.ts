"use server";

import { revalidatePath } from "next/cache";
import { assertAccessLevel } from "@/lib/auth-guards";
import { fail, ok, type ActionResult } from "@/lib/action";
import { isUuid } from "@/lib/pagination";
import { getCredentialsUrl, rejectProfessional, verifyProfessional } from "@/lib/data/admin-verification";

export async function verifyProfessionalAction(userId: string): Promise<ActionResult> {
  try {
    await assertAccessLevel("admin");
    if (!isUuid(userId)) throw new Error("Unknown professional.");
    await verifyProfessional(userId);
    revalidatePath("/admin/verification");
    return ok();
  } catch (e) {
    return fail(e);
  }
}

export async function rejectProfessionalAction(userId: string, reason: string): Promise<ActionResult> {
  try {
    await assertAccessLevel("admin");
    if (!isUuid(userId)) throw new Error("Unknown professional.");
    const text = reason.trim();
    if (text.length < 5) throw new Error("Give the professional a reason (at least 5 characters) so they can fix it.");
    if (text.length > 500) throw new Error("The reason is limited to 500 characters.");
    await rejectProfessional(userId, text);
    revalidatePath("/admin/verification");
    return ok();
  } catch (e) {
    return fail(e);
  }
}

/** Returns a 2-minute link to the credentials file. Generated on click, never stored or rendered into the page. */
export async function getCredentialsUrlAction(userId: string): Promise<ActionResult<{ url: string }>> {
  try {
    await assertAccessLevel("admin");
    if (!isUuid(userId)) throw new Error("Unknown professional.");
    return ok({ url: await getCredentialsUrl(userId) });
  } catch (e) {
    return fail(e);
  }
}
