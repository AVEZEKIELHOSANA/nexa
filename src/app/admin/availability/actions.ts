"use server";

import { revalidatePath } from "next/cache";
import { assertAccessLevel } from "@/lib/auth-guards";
import { fail, ok, type ActionResult } from "@/lib/action";
import { isUuid } from "@/lib/pagination";
import { adminDeleteSlot, createSlot, getSlotImpact, updateSlot, type SlotImpact } from "@/lib/data/availability";
import { parseMeetingUrl, parseSlotInput, type SlotFormValues } from "@/lib/slots";

const refresh = () => revalidatePath("/admin/availability");

/** Bound to the chosen professional by the page: `addSlotForAction.bind(null, professionalId)`. */
export async function addSlotForAction(professionalId: string, values: SlotFormValues): Promise<ActionResult> {
  try {
    await assertAccessLevel("admin");
    if (!isUuid(professionalId)) throw new Error("Choose a professional first.");
    await createSlot(professionalId, parseSlotInput(values));
    refresh();
    return ok();
  } catch (e) {
    return fail(e);
  }
}

export async function adminEditSlotAction(slotId: string, values: SlotFormValues, linkOnly = false): Promise<ActionResult> {
  try {
    await assertAccessLevel("admin");
    if (!isUuid(slotId)) throw new Error("Unknown slot.");
    await updateSlot(slotId, linkOnly ? { meetingUrl: parseMeetingUrl(values.meetingUrl) } : parseSlotInput(values));
    refresh();
    return ok();
  } catch (e) {
    return fail(e);
  }
}

export async function slotImpactAction(slotId: string): Promise<ActionResult<SlotImpact[]>> {
  try {
    await assertAccessLevel("admin");
    if (!isUuid(slotId)) throw new Error("Unknown slot.");
    return ok(await getSlotImpact(slotId));
  } catch (e) {
    return fail(e);
  }
}

export async function adminRemoveSlotAction(slotId: string): Promise<ActionResult<{ result: "deleted" | "cancelled" }>> {
  try {
    await assertAccessLevel("admin");
    if (!isUuid(slotId)) throw new Error("Unknown slot.");
    const result = await adminDeleteSlot(slotId);
    refresh();
    revalidatePath("/admin/requests");
    return ok({ result });
  } catch (e) {
    return fail(e);
  }
}
