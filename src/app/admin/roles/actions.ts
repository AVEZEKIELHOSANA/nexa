"use server";

import { revalidatePath } from "next/cache";
import { assertAccessLevel } from "@/lib/auth-guards";
import { fail, ok, type ActionResult } from "@/lib/action";
import { isUuid } from "@/lib/pagination";
import { createRole, deleteRole, updateRole, type AccessLevelName } from "@/lib/data/admin-roles";

const LEVELS: AccessLevelName[] = ["student", "professional", "admin"];

function clean(input: { name: string; description?: string; accessLevel?: string }) {
  const name = input.name.trim();
  if (name.length < 2 || name.length > 50) throw new Error("Role name must be 2 to 50 characters.");
  const description = (input.description ?? "").trim();
  if (description.length > 300) throw new Error("Description is limited to 300 characters.");
  const accessLevel = input.accessLevel as AccessLevelName | undefined;
  if (accessLevel && !LEVELS.includes(accessLevel)) throw new Error("Choose an access level.");
  return { name, description, accessLevel };
}

export async function createRoleAction(input: { name: string; description?: string; accessLevel: string }): Promise<ActionResult> {
  try {
    await assertAccessLevel("admin");
    const c = clean(input);
    if (!c.accessLevel) throw new Error("Choose an access level.");
    await createRole({ name: c.name, description: c.description, accessLevel: c.accessLevel });
    revalidatePath("/admin/roles");
    return ok();
  } catch (e) {
    return fail(duplicateAware(e));
  }
}

export async function updateRoleAction(input: { id: string; name: string; description?: string; accessLevel?: string }): Promise<ActionResult> {
  try {
    await assertAccessLevel("admin");
    if (!isUuid(input.id)) throw new Error("Unknown role.");
    const c = clean(input);
    await updateRole(input.id, { name: c.name, description: c.description, accessLevel: c.accessLevel });
    revalidatePath("/admin/roles");
    return ok();
  } catch (e) {
    return fail(duplicateAware(e));
  }
}

export async function deleteRoleAction(id: string): Promise<ActionResult> {
  try {
    await assertAccessLevel("admin");
    if (!isUuid(id)) throw new Error("Unknown role.");
    await deleteRole(id);
    revalidatePath("/admin/roles");
    return ok();
  } catch (e) {
    return fail(e);
  }
}

function duplicateAware(e: unknown): unknown {
  if (typeof e === "object" && e && (e as { code?: string }).code === "23505") return new Error("A role with this name already exists.");
  return e;
}
