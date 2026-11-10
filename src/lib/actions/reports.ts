"use server";

import { assertAccessLevel } from "@/lib/auth-guards";
import { fail, ok, type ActionResult } from "@/lib/action";
import { isUuid } from "@/lib/pagination";
import { fileReport, type ReportTarget } from "@/lib/data/reports";

const TARGETS: ReportTarget[] = ["professional", "student", "message"];

/** "Report a concern": any signed-in student or professional. The database validates the target. */
export async function submitReportAction(input: { targetType: ReportTarget; targetId: string; reason: string }): Promise<ActionResult> {
  try {
    const me = await assertAccessLevel("student", "professional");
    if (!TARGETS.includes(input.targetType) || !isUuid(input.targetId)) throw new Error("This cannot be reported.");
    const reason = input.reason.trim();
    if (reason.length < 5) throw new Error("Please describe your concern in at least 5 characters.");
    if (reason.length > 2000) throw new Error("Please keep it under 2000 characters.");
    await fileReport(me.id, { targetType: input.targetType, targetId: input.targetId, reason });
    return ok();
  } catch (e) {
    return fail(e);
  }
}
