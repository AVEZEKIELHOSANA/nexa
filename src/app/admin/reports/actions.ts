"use server";

import { revalidatePath } from "next/cache";
import { assertAccessLevel } from "@/lib/auth-guards";
import { fail, ok, type ActionResult } from "@/lib/action";
import { isUuid } from "@/lib/pagination";
import { removeMessage, resolveReport } from "@/lib/data/reports";

export async function resolveReportAction(reportId: string, notes: string): Promise<ActionResult> {
  try {
    await assertAccessLevel("admin");
    if (!isUuid(reportId)) throw new Error("Unknown report.");
    const text = notes.trim();
    if (text.length > 2000) throw new Error("The notes are limited to 2000 characters.");
    await resolveReport(reportId, text || undefined);
    revalidatePath("/admin/reports");
    return ok();
  } catch (e) {
    return fail(e);
  }
}

export async function removeMessageAction(messageId: string): Promise<ActionResult> {
  try {
    await assertAccessLevel("admin");
    if (!isUuid(messageId)) throw new Error("Unknown message.");
    await removeMessage(messageId);
    revalidatePath("/admin/reports");
    return ok();
  } catch (e) {
    return fail(e);
  }
}
