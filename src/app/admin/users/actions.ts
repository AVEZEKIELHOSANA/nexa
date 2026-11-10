"use server";

import { revalidatePath } from "next/cache";
import { assertAccessLevel } from "@/lib/auth-guards";
import { fail, ok, type ActionResult } from "@/lib/action";
import { isUuid } from "@/lib/pagination";
import {
  changeUserEmail,
  createUser,
  deleteUser,
  sendPasswordReset,
  updateUserProfile,
  type CreateUserInput,
} from "@/lib/data/admin-users";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function cleanName(value: string): string {
  const name = value.trim();
  if (name.length < 1 || name.length > 100) throw new Error("Enter a name (1 to 100 characters).");
  return name;
}

function cleanEmail(value: string): string {
  const email = value.trim().toLowerCase();
  if (!EMAIL_RE.test(email)) throw new Error("Enter a valid email address.");
  return email;
}

export async function createUserAction(input: CreateUserInput): Promise<ActionResult> {
  try {
    await assertAccessLevel("admin");
    if (!isUuid(input.roleId)) throw new Error("Choose a role.");
    if (!input.password || input.password.length < 8) throw new Error("Password must be at least 8 characters.");
    
    await createUser({
      email: cleanEmail(input.email),
      password: input.password,
      name: cleanName(input.name),
      roleId: input.roleId,
      dateOfBirth: input.dateOfBirth || undefined,
      careerId: input.careerId || undefined,
      bio: input.bio || undefined,
      experienceYears: input.experienceYears || undefined,
    });
    
    revalidatePath("/admin/users");
    return ok();
  } catch (e) {
    return fail(e);
  }
}

export async function updateUserAction(input: {
  userId: string;
  name?: string;
  email?: string;
  roleId?: string;
  isActive?: boolean;
}): Promise<ActionResult> {
  try {
    const admin = await assertAccessLevel("admin");
    if (!isUuid(input.userId)) throw new Error("Unknown user.");
    if (input.userId === admin.id && (input.roleId !== undefined || input.isActive !== undefined)) {
      throw new Error("You cannot change your own role or active status.");
    }
    if (input.roleId !== undefined && !isUuid(input.roleId)) throw new Error("Choose a role.");

    // Email first (Edge Function): if it fails nothing else has changed yet.
    if (input.email !== undefined) await changeUserEmail(input.userId, cleanEmail(input.email));
    await updateUserProfile(input.userId, {
      name: input.name !== undefined ? cleanName(input.name) : undefined,
      roleId: input.roleId,
      isActive: input.isActive,
    });
    revalidatePath("/admin/users");
    return ok();
  } catch (e) {
    return fail(e);
  }
}

export async function setUserActiveAction(userId: string, isActive: boolean): Promise<ActionResult> {
  try {
    const admin = await assertAccessLevel("admin");
    if (!isUuid(userId)) throw new Error("Unknown user.");
    if (userId === admin.id) throw new Error("You cannot deactivate your own account.");
    await updateUserProfile(userId, { isActive });
    revalidatePath("/admin/users");
    return ok();
  } catch (e) {
    return fail(e);
  }
}

export async function resetPasswordAction(userId: string): Promise<ActionResult> {
  try {
    await assertAccessLevel("admin");
    if (!isUuid(userId)) throw new Error("Unknown user.");
    await sendPasswordReset(userId);
    return ok();
  } catch (e) {
    return fail(e);
  }
}

export async function deleteUserAction(userId: string): Promise<ActionResult<{ mode: "hard" | "soft" }>> {
  try {
    const admin = await assertAccessLevel("admin");
    if (!isUuid(userId)) throw new Error("Unknown user.");
    if (userId === admin.id) throw new Error("You cannot delete your own account here.");
    const mode = await deleteUser(userId);
    revalidatePath("/admin/users");
    return ok({ mode });
  } catch (e) {
    return fail(e);
  }
}