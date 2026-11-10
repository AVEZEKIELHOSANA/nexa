import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getUnreadMessageCount } from "@/lib/data/messages";
import { listUpcomingSessions, type UpcomingSession } from "@/lib/data/sessions";

export type StudentDashboard = {
  pendingRequests: number;
  upcomingSessions: number;
  unreadMessages: number;
  nextSession: UpcomingSession | null;
};

export type ProfessionalDashboard = StudentDashboard & { openSlots: number };

async function countPending(column: "student_id" | "professional_id", userId: string): Promise<number> {
  const supabase = await createClient();
  const { count, error } = await supabase.from("mentorship_requests").select("id", { count: "exact", head: true }).eq(column, userId).eq("status", "pending");
  if (error) throw new Error(`Could not load your requests: ${error.message}`);
  return count ?? 0;
}

/** Counters and the next session, fetched in parallel. (Day 9 adds "courses in progress".) */
export async function getStudentDashboard(userId: string): Promise<StudentDashboard> {
  const [pendingRequests, unreadMessages, upcoming] = await Promise.all([
    countPending("student_id", userId),
    getUnreadMessageCount(),
    listUpcomingSessions({ page: 1, pageSize: 1 }),
  ]);
  return { pendingRequests, unreadMessages, upcomingSessions: upcoming.total, nextSession: upcoming.sessions[0] ?? null };
}

export async function getProfessionalDashboard(userId: string): Promise<ProfessionalDashboard> {
  const supabase = await createClient();
  const [base, openSlots] = await Promise.all([
    Promise.all([countPending("professional_id", userId), getUnreadMessageCount(), listUpcomingSessions({ page: 1, pageSize: 1 })]),
    supabase.from("availability_slots").select("id", { count: "exact", head: true }).eq("professional_id", userId).eq("status", "open").gt("start_time", new Date().toISOString()),
  ]);
  if (openSlots.error) throw new Error(`Could not count your slots: ${openSlots.error.message}`);
  const [pendingRequests, unreadMessages, upcoming] = base;
  return {
    pendingRequests,
    unreadMessages,
    upcomingSessions: upcoming.total,
    nextSession: upcoming.sessions[0] ?? null,
    openSlots: openSlots.count ?? 0,
  };
}
