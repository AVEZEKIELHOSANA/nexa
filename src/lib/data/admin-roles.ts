import "server-only";
import { createClient } from "@/lib/supabase/server";

export type AccessLevelName = "student" | "professional" | "admin";

export type RoleRow = {
  id: string;
  name: string;
  description: string | null;
  accessLevel: AccessLevelName;
  isSystem: boolean;
  userCount: number;
};

// We tell TypeScript exactly what Supabase is returning
type SupabaseRoleRow = {
  id: string;
  name: string;
  description: string | null;
  access_level: AccessLevelName;
  is_system: boolean;
  profiles: { count: number }[] | null;
};

export async function listRolesWithCounts(): Promise<RoleRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("roles")
    .select("id, name, description, access_level, is_system, profiles(count)")
    .order("is_system", { ascending: false })
    .order("name");
  
  if (error) throw new Error(`Could not load roles: ${error.message}`);
  
  // Cast the data to our known type
  const rows = (data ?? []) as unknown as SupabaseRoleRow[];

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    accessLevel: r.access_level,
    isSystem: r.is_system,
    userCount: r.profiles?.[0]?.count ?? 0,
  }));
}

export async function listRoleOptions(): Promise<{ id: string; name: string; access_level: string }[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("roles").select("id, name, access_level").order("name");
  if (error) throw new Error(`Could not load roles: ${error.message}`);
  return data ?? [];
}

export async function createRole(input: { name: string; description?: string; accessLevel: AccessLevelName }): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("roles").insert({
    name: input.name,
    description: input.description || null,
    access_level: input.accessLevel,
  });
  if (error) throw error;
}

export async function updateRole(
  id: string,
  input: { name: string; description?: string; accessLevel?: AccessLevelName }
): Promise<void> {
  const supabase = await createClient();
  const patch: { name: string; description: string | null; access_level?: AccessLevelName } = {
    name: input.name,
    description: input.description || null,
  };
  if (input.accessLevel) patch.access_level = input.accessLevel;
  const { data, error } = await supabase.from("roles").update(patch).eq("id", id).select("id");
  if (error) throw error;
  if (!data || data.length === 0) throw new Error("Built-in roles cannot be edited.");
}

export async function deleteRole(id: string): Promise<void> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("roles").delete().eq("id", id).select("id");
  if (error) throw error;
  if (!data || data.length === 0) throw new Error("This role cannot be deleted: it is built-in or still has users.");
}