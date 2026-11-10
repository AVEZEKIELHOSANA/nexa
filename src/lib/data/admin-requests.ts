import "server-only";
import { createClient } from "@/lib/supabase/server";
import { PAGE_SIZE } from "@/lib/pagination";

export type AdminRequest = {
  id: string;
  status: "pending" | "accepted" | "declined" | "cancelled";
  createdAt: string;
  decidedAt: string | null;
  studentId: string;
  studentName: string;
  professionalId: string;
  professionalName: string;
  careerName: string | null;
  startTime: string;
  endTime: string;
};

export async function listAllRequests(opts: { status?: string; careerId?: string; page?: number; pageSize?: number }): Promise<{ requests: AdminRequest[]; total: number }> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_list_requests", {
    p_status: opts.status,
    p_career_id: opts.careerId,
    p_page: opts.page ?? 1,
    p_page_size: opts.pageSize ?? PAGE_SIZE,
  });
  if (error) throw new Error(`Could not load requests: ${error.message}`);
  const rows = data ?? [];
  return {
    total: Number(rows[0]?.total_count ?? 0),
    // FIXED HERE
    requests: rows.map((r: Record<string, unknown>) => ({
      id: r.request_id as string,
      status: r.status as AdminRequest["status"],
      createdAt: r.created_at as string,
      decidedAt: r.decided_at as string | null,
      studentId: r.student_id as string,
      studentName: r.student_name as string,
      professionalId: r.professional_id as string,
      professionalName: r.professional_name as string,
      careerName: (r.career_name as string) ?? null,
      startTime: r.start_time as string,
      endTime: r.end_time as string,
    })),
  };
}