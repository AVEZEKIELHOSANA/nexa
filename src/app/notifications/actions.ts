"use server";

import { revalidatePath } from "next/cache";
import { assertAccessLevel } from "@/lib/auth-guards";
import { fail, ok, type ActionResult } from "@/lib/action";
import { isUuid } from "@/lib/pagination";
import { markAllNotificationsRead, markNotificationRead } from "@/lib/data/notifications";

export async function markNotificationReadAction(id: string): Promise<ActionResult> {
  try {
    await assertAccessLevel("student", "professional");
    if (!isUuid(id)) throw new Error("Unknown notification.");
    await markNotificationRead(id);
    revalidatePath("/", "layout"); // the navbar badge
    return ok();
  } catch (e) {
    return fail(e);
  }
}

export async function markAllReadAction(): Promise<ActionResult<{ count: number }>> {
  try {
    await assertAccessLevel("student", "professional");
    const count = await markAllNotificationsRead();
    revalidatePath("/", "layout");
    return ok({ count });
  } catch (e) {
    return fail(e);
  }
}
