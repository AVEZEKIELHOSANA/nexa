"use server";

import { revalidatePath } from "next/cache";
import { assertAccessLevel } from "@/lib/auth-guards";
import { fail, ok, type ActionResult } from "@/lib/action";
import { isUuid } from "@/lib/pagination";
import { createSlot, deleteOpenSlot, updateSlot } from "@/lib/data/availability";
import { parseMeetingUrl, parseSlotInput, type SlotFormValues } from "@/lib/slots";

const refresh = () => {
  revalidatePath("/pro/availability");
  revalidatePath("/pro");
};

export async function addSlotAction(values: SlotFormValues): Promise<ActionResult> {
  try {
    const me = await assertAccessLevel("professional");
    const input = parseSlotInput(values);
    await createSlot(me.id, input);
    refresh();
    return ok();
  } catch (e) {
    return fail(e);
  }
}

export async function editSlotAction(slotId: string, values: SlotFormValues, linkOnly = false): Promise<ActionResult> {
  try {
    await assertAccessLevel("professional");
    if (!isUuid(slotId)) throw new Error("Unknown slot.");
    // Professionals may only edit open slots; the database refuses anything else.
    await updateSlot(slotId, linkOnly ? { meetingUrl: parseMeetingUrl(values.meetingUrl) } : parseSlotInput(values));
    refresh();
    return ok();
  } catch (e) {
    return fail(e);
  }
}

export async function removeSlotAction(slotId: string): Promise<ActionResult<{ result: "deleted" | "cancelled" }>> {
  try {
    await assertAccessLevel("professional");
    if (!isUuid(slotId)) throw new Error("Unknown slot.");
    const result = await deleteOpenSlot(slotId);
    refresh();
    return ok({ result });
  } catch (e) {
    return fail(e);
  }
}
