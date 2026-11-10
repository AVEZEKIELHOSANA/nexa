import "server-only";
import { createClient } from "@/lib/supabase/server";
import { PAGE_SIZE } from "@/lib/pagination";

export type Mentee = {
  studentId: string;
  name: string;
  sessions: number;
  nextSession: string | null;
  lastSession: string | null;
  /** most recent accepted request: where the conversation link points */
  conversationRequestId: string;
};

type Row = {
  id: string;
  student_id: string;
  created_at: string;
  slot: { start_time: string } | null;
  student: { name: string } | null;
};

const MAX_ROWS = 500; // a pilot-sized safety cap

/**
 * Students the signed-in professional has accepted, one row per student (not per session), newest
 * mentee first. Grouping happens here because it is a few hundred rows at most.
 */
export async function listMentees(professionalId: string, opts: { page?: number; pageSize?: number } = {}): Promise<{ mentees: Mentee[]; total: number }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("mentorship_requests")
    .select("id, student_id, created_at, slot:availability_slots(start_time), student:profiles!mentorship_requests_student_id_fkey(name)")
    .eq("professional_id", professionalId)
    .eq("status", "accepted")
    .order("created_at", { ascending: false })
    .limit(MAX_ROWS)
    .overrideTypes<Row[], { merge: false }>();
  if (error) throw new Error(`Could not load your mentees: ${error.message}`);

  const now = Date.now();
  const byStudent = new Map<string, Mentee>();
  for (const r of data ?? []) {
    const start = r.slot?.start_time ?? null;
    const m = byStudent.get(r.student_id) ?? {
      studentId: r.student_id,
      name: r.student?.name ?? "Student",
      sessions: 0,
      nextSession: null,
      lastSession: null,
      conversationRequestId: r.id, // rows are newest first, so the first one seen is the latest
    };
    m.sessions += 1;
    if (start) {
      const t = new Date(start).getTime();
      if (t > now) m.nextSession = !m.nextSession || t < new Date(m.nextSession).getTime() ? start : m.nextSession;
      else m.lastSession = !m.lastSession || t > new Date(m.lastSession).getTime() ? start : m.lastSession;
    }
    byStudent.set(r.student_id, m);
  }

  const all = [...byStudent.values()];
  const size = opts.pageSize ?? PAGE_SIZE;
  const from = ((opts.page ?? 1) - 1) * size;
  return { total: all.length, mentees: all.slice(from, from + size) };
}
