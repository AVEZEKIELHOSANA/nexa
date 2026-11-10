import "server-only";
import { createClient } from "@/lib/supabase/server";
import { rangeFor } from "@/lib/pagination";

export type DirectoryCareer = { id: string; name: string; description: string | null; professionalCount: number };

/** Active careers with their count of verified professionals (view career_directory). */
export async function listCareerDirectory(opts: { search?: string; page?: number; pageSize?: number }): Promise<{ careers: DirectoryCareer[]; total: number }> {
  const supabase = await createClient();
  const size = opts.pageSize ?? 24;
  const { from, to } = rangeFor(opts.page ?? 1, size);
  let query = supabase
    .from("career_directory")
    .select("id, name, description, professional_count", { count: "exact" })
    .order("professional_count", { ascending: false })
    .order("name")
    .range(from, to);
  if (opts.search) query = query.ilike("name", `%${opts.search.replace(/[%_\\]/g, (c) => `\\${c}`)}%`);
  const { data, error, count } = await query;
  if (error) throw new Error(`Could not load careers: ${error.message}`);
  return {
    total: count ?? 0,
    careers: (data ?? []).map((c) => ({
      id: c.id as string,
      name: c.name as string,
      description: c.description,
      professionalCount: Number(c.professional_count ?? 0),
    })),
  };
}

export async function getDirectoryCareer(id: string): Promise<DirectoryCareer | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("career_directory")
    .select("id, name, description, professional_count")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`Could not load the career: ${error.message}`);
  if (!data) return null;
  return { id: data.id as string, name: data.name as string, description: data.description, professionalCount: Number(data.professional_count ?? 0) };
}
