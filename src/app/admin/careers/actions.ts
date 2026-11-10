"use server";

import { revalidatePath } from "next/cache";
import { assertAccessLevel } from "@/lib/auth-guards";
import { fail, ok, type ActionResult } from "@/lib/action";
import { isUuid } from "@/lib/pagination";
import { createCareer, setCareerActive, updateCareer } from "@/lib/data/admin-careers";

function clean(input: { name: string; description?: string }) {
  const name = input.name.trim();
  if (name.length < 2 || name.length > 80) throw new Error("Career name must be 2 to 80 characters.");
  const description = (input.description ?? "").trim();
  if (description.length > 500) throw new Error("Description is limited to 500 characters.");
  return { name, description };
}

function refresh() {
  revalidatePath("/admin/careers");
  revalidatePath("/careers");
}

export async function createCareerAction(input: { name: string; description?: string }): Promise<ActionResult> {
  try {
    await assertAccessLevel("admin");
    await createCareer(clean(input));
    refresh();
    return ok();
  } catch (e) {
    return fail(e);
  }
}

export async function updateCareerAction(input: { id: string; name: string; description?: string }): Promise<ActionResult> {
  try {
    await assertAccessLevel("admin");
    if (!isUuid(input.id)) throw new Error("Unknown career.");
    await updateCareer(input.id, clean(input));
    refresh();
    return ok();
  } catch (e) {
    return fail(e);
  }
}

export async function setCareerActiveAction(id: string, isActive: boolean): Promise<ActionResult> {
  try {
    await assertAccessLevel("admin");
    if (!isUuid(id)) throw new Error("Unknown career.");
    await setCareerActive(id, isActive);
    refresh();
    return ok();
  } catch (e) {
    return fail(e);
  }
}
