import "server-only";
import { createClient } from "@/lib/supabase/server";
import { PAGE_SIZE } from "@/lib/pagination";

export type AdminStudent = {
  id: string;
  name: string;
  email: string | null;
  isActive: boolean;
  isMinor: boolean;
  consent: "not_needed" | "given" | "awaiting";
  interestCount: number;
  coursesCompleted: number;
  sessions: number;
  createdAt: string;
  lastSignInAt: string | null;
};

export async function listStudents(opts: { search?: string; status?: "active" | "inactive" | "awaiting_consent"; page?: number; pageSize?: number }): Promise<{ students: AdminStudent[]; total: number }> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_list_students", { p_search: opts.search, p_status: opts.status, p_page: opts.page ?? 1, p_page_size: opts.pageSize ?? PAGE_SIZE });
  if (error) throw new Error(`Could not load students: ${error.message}`);
  const rows = data ?? [];
  return {
    total: Number(rows[0]?.total_count ?? 0),
    // FIXED HERE
    students: rows.map((r: Record<string, unknown>) => ({
      id: r.id as string, 
      name: r.name as string, 
      email: (r.email as string | null) ?? null, 
      isActive: r.is_active as boolean, 
      isMinor: r.is_minor as boolean,
      consent: r.consent_status as AdminStudent["consent"], 
      interestCount: r.interest_count as number, 
      coursesCompleted: r.courses_completed as number, 
      sessions: r.sessions_count as number,
      createdAt: r.created_at as string, 
      lastSignInAt: (r.last_sign_in_at as string | null) ?? null,
    })),
  };
}