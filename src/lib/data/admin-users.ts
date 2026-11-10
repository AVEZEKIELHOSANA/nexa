import "server-only";
import { createClient } from "@/lib/supabase/server";
import { invokeEdge } from "@/lib/data/edge";
import { PAGE_SIZE } from "@/lib/pagination";

export type AdminUser = {
  id: string;
  name: string;
  email: string | null;
  roleId: string;
  roleName: string;
  accessLevel: "student" | "professional" | "admin";
  isActive: boolean;
  deletedAt: string | null;
  createdAt: string;
  lastSignInAt: string | null;
  emailConfirmed: boolean;
};

export type UserListQuery = {
  search?: string;
  roleId?: string;
  active?: boolean;
  accessLevel?: "student" | "professional" | "admin";
  sort?: "name" | "email" | "role" | "created_at";
  desc?: boolean;
  page?: number;
  pageSize?: number;
};

export async function listUsers(q: UserListQuery): Promise<{ users: AdminUser[]; total: number }> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_list_users", {
    p_search: q.search,
    p_role_id: q.roleId,
    p_active: q.active,
    p_access_level: q.accessLevel,
    p_sort: q.sort ?? "created_at",
    p_desc: q.desc ?? true,
    p_page: q.page ?? 1,
    p_page_size: q.pageSize ?? PAGE_SIZE,
  });
  if (error) throw new Error(`Could not load users: ${error.message}`);

  const rows = data ?? [];
  return {
    total: Number(rows[0]?.total_count ?? 0),
    // FIXED HERE
    users: rows.map((r: Record<string, unknown>) => ({
      id: r.id as string,
      name: r.name as string,
      email: (r.email as string | null) ?? null,
      roleId: r.role_id as string,
      roleName: r.role_name as string,
      accessLevel: r.access_level as AdminUser["accessLevel"],
      isActive: r.is_active as boolean,
      deletedAt: (r.deleted_at as string | null) ?? null,
      createdAt: r.created_at as string,
      lastSignInAt: (r.last_sign_in_at as string | null) ?? null,
      emailConfirmed: r.email_confirmed as boolean,
    })),
  };
}

export async function updateUserProfile(
  userId: string,
  changes: { name?: string; roleId?: string; isActive?: boolean }
): Promise<void> {
  const patch: { name?: string; role_id?: string; is_active?: boolean } = {};
  if (changes.name !== undefined) patch.name = changes.name;
  if (changes.roleId !== undefined) patch.role_id = changes.roleId;
  if (changes.isActive !== undefined) patch.is_active = changes.isActive;
  if (Object.keys(patch).length === 0) return;

  const supabase = await createClient();
  const { data, error } = await supabase.from("profiles").update(patch).eq("id", userId).select("id");
  if (error) throw error;
  if (!data || data.length === 0) throw new Error("User not found, or you are not allowed to change it.");
}

export type CreateUserInput = {
  email: string;
  password?: string;
  name: string;
  roleId: string;
  dateOfBirth?: string;
  careerId?: string;
  bio?: string;
  experienceYears?: string;
};

export async function createUser(input: CreateUserInput): Promise<void> {
  await invokeEdge("admin-create-user", {
    email: input.email,
    password: input.password,
    name: input.name,
    role_id: input.roleId,
    date_of_birth: input.dateOfBirth,
    career_id: input.careerId,
    bio: input.bio,
    experience_years: input.experienceYears,
  });
}

export async function changeUserEmail(userId: string, email: string): Promise<void> {
  await invokeEdge("admin-update-user", { user_id: userId, email });
}

export async function sendPasswordReset(userId: string): Promise<void> {
  await invokeEdge("admin-reset-password", { user_id: userId });
}

export async function deleteUser(userId: string): Promise<"hard" | "soft"> {
  const result = await invokeEdge<{ mode: "hard" | "soft" }>("admin-delete-user", { user_id: userId });
  return result.mode;
}