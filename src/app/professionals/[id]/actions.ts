"use server";

import { revalidatePath } from "next/cache";
import { assertAccessLevel } from "@/lib/auth-guards";
import { fail, ok, type ActionResult } from "@/lib/action";
import { isUuid } from "@/lib/pagination";
import { requestSession } from "@/lib/data/professionals";

export async function requestSessionAction(input: { professionalId: string; slotId: string; message?: string }): Promise<ActionResult<{ requestId: string }>> {
  try {
    await assertAccessLevel("student");
    if (!isUuid(input.slotId)) throw new Error("Choose a time slot.");
    const message = (input.message ?? "").trim();
    if (message.length > 1000) throw new Error("Your message must be 1000 characters or fewer.");
    const requestId = await requestSession(input.slotId, message || undefined);
    revalidatePath(`/professionals/${input.professionalId}`);
    revalidatePath("/student/requests");
    return ok({ requestId });
  } catch (e) {
    return fail(e);
  }
}
