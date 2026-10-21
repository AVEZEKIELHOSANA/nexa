import { createClient } from "@/lib/supabase/server";

/**
 * Data layer rule: pages and components never call supabase-js directly. They
 * import typed functions from lib/data/*. If the backend ever moves to FastAPI
 * (Phase 2), only these files change; no page does.
 */

export type Career = { id: string; name: string; description: string | null };

export async function listActiveCareers(): Promise<Career[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("careers")
    .select("id, name, description")
    .eq("is_active", true)
    .order("name");
  if (error) throw new Error(`Could not load careers: ${error.message}`);
  return data ?? [];
}
