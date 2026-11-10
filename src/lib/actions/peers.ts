"use server";

import { revalidatePath } from "next/cache";
import { assertAccessLevel } from "@/lib/auth-guards";
import { fail, ok, type ActionResult } from "@/lib/action";
import { isUuid } from "@/lib/pagination";
import { answerConnection, requestConnection } from "@/lib/data/peers";

function refresh() {
  revalidatePath("/student/peers");
  revalidatePath("/student/peers/connections");
  revalidatePath("/student");
}

/** Ask another student to connect. The database checks age band, consent, duplicates and the daily cap. */
export async function connectAction(recipientId: string): Promise<ActionResult> {
  try {
    const me = await assertAccessLevel("student");
    if (!isUuid(recipientId)) throw new Error("Unknown student.");
    await requestConnection(me.id, recipientId);
    refresh();
    return ok();
  } catch (e) {
    return fail(e);
  }
}

export async function answerConnectionAction(connectionId: string, accept: boolean): Promise<ActionResult> {
  try {
    await assertAccessLevel("student");
    if (!isUuid(connectionId)) throw new Error("Unknown request.");
    await answerConnection(connectionId, accept);
    refresh();
    return ok();
  } catch (e) {
    return fail(e);
  }
}
