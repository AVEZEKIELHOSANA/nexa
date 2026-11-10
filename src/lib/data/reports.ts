import "server-only";
import { createClient } from "@/lib/supabase/server";
import { PAGE_SIZE } from "@/lib/pagination";

export type ReportTarget = "professional" | "student" | "message";

/** File a report as the signed-in user. The database checks the relationship and rate-limits. */
export async function fileReport(reporterId: string, input: { targetType: ReportTarget; targetId: string; reason: string }): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("reports").insert({ reporter_id: reporterId, target_type: input.targetType, target_id: input.targetId, reason: input.reason });
  if (error) throw error;
}

export type AdminReport = {
  id: string;
  status: "open" | "resolved";
  targetType: ReportTarget;
  targetId: string;
  targetName: string | null;
  reason: string;
  reporterId: string;
  reporterName: string;
  createdAt: string;
  resolvedAt: string | null;
  resolutionNotes: string | null;
};

export async function listReports(opts: { status?: "open" | "resolved"; page?: number; pageSize?: number }): Promise<{ reports: AdminReport[]; total: number }> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_list_reports", { p_status: opts.status, p_page: opts.page ?? 1, p_page_size: opts.pageSize ?? PAGE_SIZE });
  if (error) throw new Error(`Could not load reports: ${error.message}`);
  const rows = data ?? [];
  return { total: Number(rows[0]?.total_count ?? 0), reports: rows.map((r: ReportRow) => mapReport(r)) };
}

type ReportRow = {
  id: string;
  status: string;
  target_type: string;
  target_id: string;
  target_name: string | null;
  reason: string;
  reporter_id: string;
  reporter_name: string;
  created_at: string;
  resolved_at: string | null;
  resolution_notes: string | null;
};

function mapReport(r: ReportRow): AdminReport {
  return {
    id: r.id,
    status: r.status as AdminReport["status"],
    targetType: r.target_type as ReportTarget,
    targetId: r.target_id,
    targetName: r.target_name ?? null,
    reason: r.reason,
    reporterId: r.reporter_id,
    reporterName: r.reporter_name,
    createdAt: r.created_at,
    resolvedAt: r.resolved_at ?? null,
    resolutionNotes: r.resolution_notes ?? null,
  };
}

/** One report with names resolved. Admin only (RLS). */
export async function getReport(id: string): Promise<AdminReport | null> {
  const supabase = await createClient();
  const { data: row, error } = await supabase
    .from("reports")
    .select("id, status, target_type, target_id, reason, reporter_id, created_at, resolved_at, resolution_notes")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`Could not load the report: ${error.message}`);
  if (!row) return null;

  let targetPersonId: string | null = row.target_id;
  if (row.target_type === "message") {
    const { data: m } = await supabase.from("messages").select("sender_id").eq("id", row.target_id).maybeSingle();
    targetPersonId = m?.sender_id ?? null;
  }
  const [reporter, target] = await Promise.all([
    supabase.from("profiles").select("name").eq("id", row.reporter_id).maybeSingle(),
    targetPersonId ? supabase.from("profiles").select("name").eq("id", targetPersonId).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  return mapReport({
    ...row,
    target_name: target.data?.name ?? null,
    reporter_name: reporter.data?.name ?? "Unknown",
  });
}

export type ContextMessage = { id: string; senderId: string; senderName: string; body: string; createdAt: string; removed: boolean };
export type ReportContext = {
  requestId: string | null;
  highlightMessageId: string | null;
  participants: { studentName: string; professionalName: string } | null;
  messages: ContextMessage[];
  truncated: boolean;
};

const CONTEXT_LIMIT = 200;

/**
 * The conversation a report is about, for the admin to read: for a reported message, the thread that
 * contains it; for a reported person, the most recent conversation between them and the reporter.
 * Administrators can read everything, including messages already removed (shown as removed).
 */
export async function getReportContext(report: AdminReport): Promise<ReportContext> {
  const supabase = await createClient();
  let requestId: string | null = null;
  let highlight: string | null = null;

  if (report.targetType === "message") {
    const { data } = await supabase.from("messages").select("mentorship_request_id").eq("id", report.targetId).maybeSingle();
    requestId = data?.mentorship_request_id ?? null;
    highlight = report.targetId;
  } else {
    const pair = report.targetType === "professional" ? { student: report.reporterId, professional: report.targetId } : { student: report.targetId, professional: report.reporterId };
    const { data } = await supabase
      .from("mentorship_requests")
      .select("id")
      .eq("student_id", pair.student)
      .eq("professional_id", pair.professional)
      .in("status", ["accepted", "cancelled"])
      .order("created_at", { ascending: false })
      .limit(1);
    requestId = data?.[0]?.id ?? null;
  }
  if (!requestId) return { requestId: null, highlightMessageId: highlight, participants: null, messages: [], truncated: false };

  const [{ data: req }, { data: msgs }] = await Promise.all([
    supabase.from("mentorship_requests").select("student:profiles!mentorship_requests_student_id_fkey(name), professional:profiles!mentorship_requests_professional_id_fkey(name), student_id, professional_id").eq("id", requestId).maybeSingle(),
    supabase.from("messages").select("id, sender_id, body, created_at, deleted_at").eq("mentorship_request_id", requestId).order("created_at", { ascending: false }).limit(CONTEXT_LIMIT + 1),
  ]);

  const studentName = (req?.student as { name: string } | null)?.name ?? "Student";
  const professionalName = (req?.professional as { name: string } | null)?.name ?? "Professional";
  const rows = msgs ?? [];
  return {
    requestId,
    highlightMessageId: highlight,
    participants: { studentName, professionalName },
    truncated: rows.length > CONTEXT_LIMIT,
    messages: rows
      .slice(0, CONTEXT_LIMIT)
      .reverse()
      .map((m) => ({ id: m.id, senderId: m.sender_id, senderName: m.sender_id === req?.student_id ? studentName : professionalName, body: m.body, createdAt: m.created_at, removed: m.deleted_at !== null })),
  };
}

export async function resolveReport(id: string, notes?: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("resolve_report", { p_report_id: id, p_notes: notes });
  if (error) throw error;
}

export async function removeMessage(messageId: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_remove_message", { p_message_id: messageId });
  if (error) throw error;
}

export async function countOpenReports(): Promise<number> {
  const supabase = await createClient();
  const { count, error } = await supabase.from("reports").select("id", { count: "exact", head: true }).eq("status", "open");
  if (error) throw new Error(`Could not count reports: ${error.message}`);
  return count ?? 0;
}
