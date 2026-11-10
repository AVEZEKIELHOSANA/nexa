import "server-only";
import { createClient } from "@/lib/supabase/server";

export type AdminStats = {
  students: number;
  professionals: number;
  admins: number;
  newUsers7d: number;
  awaitingConsent: number;
  pendingVerifications: number;
  openReports: number;
  pendingRequests: number;
  upcomingSessions: number;
  completedSessions: number;
  messages7d: number;
  publishedCourses: number;
  courseCompletions: number;
  peerConnections: number;
};

export async function getAdminStats(): Promise<AdminStats> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_stats");
  if (error) throw new Error(`Could not load the statistics: ${error.message}`);
  const r = (Array.isArray(data) ? data[0] : data) as Record<string, number | string> | undefined;
  const n = (k: string) => Number(r?.[k] ?? 0);
  return {
    students: n("students"), professionals: n("professionals"), admins: n("admins"), newUsers7d: n("new_users_7d"),
    awaitingConsent: n("awaiting_consent"), pendingVerifications: n("pending_verifications"), openReports: n("open_reports"),
    pendingRequests: n("pending_requests"), upcomingSessions: n("upcoming_sessions"), completedSessions: n("completed_sessions"),
    messages7d: n("messages_7d"), publishedCourses: n("published_courses"), courseCompletions: n("course_completions"),
    peerConnections: n("peer_connections"),
  };
}

export type SignupDay = { day: string; students: number; professionals: number };

export async function getSignupsByDay(days = 14): Promise<SignupDay[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_signups_by_day", { p_days: days, p_tz: process.env.NEXT_PUBLIC_TIMEZONE || "Africa/Douala" });
  if (error) throw new Error(`Could not load sign-ups: ${error.message}`);
  
  // FIXED HERE: Changed (r: any) to (r: Record<string, unknown>)
  return (data ?? []).map((r: Record<string, unknown>) => ({ 
    day: r.day as string, 
    students: Number(r.students), 
    professionals: Number(r.professionals) 
  }));
}