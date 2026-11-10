import "server-only";
import { createClient } from "@/lib/supabase/server";
import { PAGE_SIZE, rangeFor } from "@/lib/pagination";

export type AdminCareer = { id: string; name: string; description: string | null; isActive: boolean };

export async function listCareersAdmin(opts: {
  search?: string;
  status?: "active" | "archived";
  page?: number;
  pageSize?: number;
}): Promise<{ careers: AdminCareer[]; total: number }> {
  const supabase = await createClient();
  const size = opts.pageSize ?? PAGE_SIZE;
  const { from, to } = rangeFor(opts.page ?? 1, size);

  let query = supabase
    .from("careers")
    .select("id, name, description, is_active", { count: "exact" })
    .order("is_active", { ascending: false })
    .order("name")
    .range(from, to);
  if (opts.status === "active") query = query.eq("is_active", true);
  if (opts.status === "archived") query = query.eq("is_active", false);
  if (opts.search) query = query.ilike("name", `%${opts.search.replace(/[%_\\]/g, (c) => `\\${c}`)}%`);

  const { data, error, count } = await query;
  if (error) throw new Error(`Could not load careers: ${error.message}`);
  return {
    total: count ?? 0,
    careers: (data ?? []).map((c) => ({ id: c.id, name: c.name, description: c.description, isActive: c.is_active })),
  };
}

export async function createCareer(input: { name: string; description?: string }): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("careers").insert({ name: input.name, description: input.description || null });
  if (error) {
    if (error.code === "23505") throw new Error("A career with this name already exists.");
    throw error;
  }
}

export async function updateCareer(id: string, input: { name: string; description?: string }): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("careers").update({ name: input.name, description: input.description || null }).eq("id", id);
  if (error) {
    if (error.code === "23505") throw new Error("A career with this name already exists.");
    throw error;
  }
}

/** "Delete" is archive: the career disappears from sign-up and browsing but existing profiles keep it. */
export async function setCareerActive(id: string, isActive: boolean): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("careers").update({ is_active: isActive }).eq("id", id);
  if (error) throw error;
}
