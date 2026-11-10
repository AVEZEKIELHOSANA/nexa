import "server-only";
import { createClient } from "@/lib/supabase/server";
import { PAGE_SIZE, rangeFor } from "@/lib/pagination";

export type UpcomingSession = {
  requestId: string;
  slotId: string;
  studentId: string;
  studentName: string;
  professionalId: string;
  professionalName: string;
  startTime: string;
  endTime: string;
  meetingUrl: string | null;
};

/** The signed-in person's accepted sessions that have not ended yet, soonest first (view upcoming_sessions). */
export async function listUpcomingSessions(opts: { page?: number; pageSize?: number } = {}): Promise<{ sessions: UpcomingSession[]; total: number }> {
  const supabase = await createClient();
  const { from, to } = rangeFor(opts.page ?? 1, opts.pageSize ?? PAGE_SIZE);
  const { data, error, count } = await supabase
    .from("upcoming_sessions")
    .select("request_id, slot_id, student_id, student_name, professional_id, professional_name, start_time, end_time, meeting_url", { count: "exact" })
    .order("start_time")
    .range(from, to);
  if (error) throw new Error(`Could not load sessions: ${error.message}`);
  return {
    total: count ?? 0,
    sessions: (data ?? []).map((s) => ({
      requestId: s.request_id as string,
      slotId: s.slot_id as string,
      studentId: s.student_id as string,
      studentName: s.student_name as string,
      professionalId: s.professional_id as string,
      professionalName: s.professional_name as string,
      startTime: s.start_time as string,
      endTime: s.end_time as string,
      meetingUrl: s.meeting_url,
    })),
  };
}

/** How many upcoming sessions the signed-in person has (dashboard counter). */
export async function countUpcomingSessions(): Promise<number> {
  const supabase = await createClient();
  const { count, error } = await supabase.from("upcoming_sessions").select("request_id", { count: "exact", head: true });
  if (error) throw new Error(`Could not count sessions: ${error.message}`);
  return count ?? 0;
}
