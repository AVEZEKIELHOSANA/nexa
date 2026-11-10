"use server";

import { revalidatePath } from "next/cache";
import { assertAccessLevel } from "@/lib/auth-guards";
import { fail, ok, type ActionResult } from "@/lib/action";
import { isUuid } from "@/lib/pagination";
import { acceptRequest, cancelSession, declineRequest } from "@/lib/data/requests";

/**
 * Server Actions shared by several screens: the student's request pages, and the professional's
 * request and session pages (Day 7). The database functions do the real checks (who may do what,
 * locking the slot); these wrappers add the sign-in check and friendly errors.
 */

function refreshEverything() {
  // Counters in the navbar, dashboards and every list depend on these changes.
  revalidatePath("/", "layout");
}

function cleanReason(reason: string | undefined): string | undefined {
  const text = (reason ?? "").trim();
  if (text.length > 500) throw new Error("The reason must be 500 characters or fewer.");
  return text || undefined;
}

/** Student withdraws a pending request, or either person cancels an accepted session. */
export async function cancelSessionAction(requestId: string, reason?: string): Promise<ActionResult> {
  try {
    await assertAccessLevel("student", "professional");
    if (!isUuid(requestId)) throw new Error("Unknown request.");
    await cancelSession(requestId, cleanReason(reason));
    refreshEverything();
    return ok();
  } catch (e) {
    return fail(e);
  }
}

export async function acceptRequestAction(requestId: string): Promise<ActionResult> {
  try {
    await assertAccessLevel("professional");
    if (!isUuid(requestId)) throw new Error("Unknown request.");
    await acceptRequest(requestId);
    refreshEverything();
    return ok();
  } catch (e) {
    return fail(e);
  }
}

export async function declineRequestAction(requestId: string, reason?: string): Promise<ActionResult> {
  try {
    await assertAccessLevel("professional");
    if (!isUuid(requestId)) throw new Error("Unknown request.");
    await declineRequest(requestId, cleanReason(reason));
    refreshEverything();
    return ok();
  } catch (e) {
    return fail(e);
  }
}
