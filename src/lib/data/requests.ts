import "server-only";
import { createClient } from "@/lib/supabase/server";
import { PAGE_SIZE, rangeFor } from "@/lib/pagination";

export type RequestStatus = "pending" | "accepted" | "declined" | "cancelled";
export const REQUEST_STATUSES: RequestStatus[] = ["pending", "accepted", "declined", "cancelled"];

/** Which side of the request the signed-in person is on. It decides which column is "me". */
export type Perspective = "student" | "professional";

export type RequestItem = {
  id: string;
  status: RequestStatus;
  message: string | null;
  declineReason: string | null;
  cancelReason: string | null;
  createdAt: string;
  decidedAt: string | null;
  cancelledAt: string | null;
  slot: { id: string; startTime: string; endTime: string; status: string };
  /** the other person: the professional for a student, the student for a professional */
  otherId: string;
  otherName: string;
};

const SELECT =
  "id, status, message, decline_reason, cancel_reason, created_at, decided_at, cancelled_at, student_id, professional_id, " +
  "slot:availability_slots(id, start_time, end_time, status), " +
  "student:profiles!mentorship_requests_student_id_fkey(name), " +
  "professional:profiles!mentorship_requests_professional_id_fkey(name)";

type Row = {
  id: string;
  status: string;
  message: string | null;
  decline_reason: string | null;
  cancel_reason: string | null;
  created_at: string;
  decided_at: string | null;
  cancelled_at: string | null;
  student_id: string;
  professional_id: string;
  slot: { id: string; start_time: string; end_time: string; status: string } | null;
  student: { name: string } | null;
  professional: { name: string } | null;
};

function map(r: Row, perspective: Perspective): RequestItem {
  const mine = perspective === "student";
  return {
    id: r.id,
    status: r.status as RequestStatus,
    message: r.message,
    declineReason: r.decline_reason,
    cancelReason: r.cancel_reason,
    createdAt: r.created_at,
    decidedAt: r.decided_at,
    cancelledAt: r.cancelled_at,
    slot: {
      id: r.slot?.id ?? "",
      startTime: r.slot?.start_time ?? r.created_at,
      endTime: r.slot?.end_time ?? r.created_at,
      status: r.slot?.status ?? "cancelled",
    },
    otherId: mine ? r.professional_id : r.student_id,
    otherName: (mine ? r.professional?.name : r.student?.name) ?? (mine ? "Professional" : "Student"),
  };
}

/** The signed-in person's requests with one status, newest first (RLS limits rows to their own). */
export async function listMyRequests(
  userId: string,
  perspective: Perspective,
  opts: { status: RequestStatus; page?: number; pageSize?: number }
): Promise<{ requests: RequestItem[]; total: number }> {
  const supabase = await createClient();
  const { from, to } = rangeFor(opts.page ?? 1, opts.pageSize ?? PAGE_SIZE);
  const { data, error, count } = await supabase
    .from("mentorship_requests")
    .select(SELECT, { count: "exact" })
    .eq(perspective === "student" ? "student_id" : "professional_id", userId)
    .eq("status", opts.status)
    .order("created_at", { ascending: false })
    .range(from, to)
    .overrideTypes<Row[], { merge: false }>();
  if (error) throw new Error(`Could not load requests: ${error.message}`);
  return { total: count ?? 0, requests: (data ?? []).map((r) => map(r, perspective)) };
}

export async function countMyRequestsByStatus(userId: string, perspective: Perspective): Promise<Record<RequestStatus, number>> {
  const supabase = await createClient();
  const column = perspective === "student" ? "student_id" : "professional_id";
  const result: Record<RequestStatus, number> = { pending: 0, accepted: 0, declined: 0, cancelled: 0 };
  await Promise.all(
    REQUEST_STATUSES.map(async (status) => {
      const { count } = await supabase.from("mentorship_requests").select("id", { count: "exact", head: true }).eq(column, userId).eq("status", status);
      result[status] = count ?? 0;
    })
  );
  return result;
}

export type RequestDetail = RequestItem & { meetingUrl: string | null };

/** One request of the signed-in person, with the meeting link once it is accepted. Null if not theirs. */
export async function getMyRequest(id: string, perspective: Perspective): Promise<RequestDetail | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("mentorship_requests").select(SELECT).eq("id", id).maybeSingle().overrideTypes<Row, { merge: false }>();
  if (error) throw new Error(`Could not load the request: ${error.message}`);
  if (!data) return null;
  const item = map(data, perspective);

  let meetingUrl: string | null = null;
  if (item.status === "accepted" && item.slot.id) {
    // slot_links only returns the link to the slot's owner, an admin and the accepted student
    const { data: link } = await supabase.from("slot_links").select("meeting_url").eq("slot_id", item.slot.id).maybeSingle();
    meetingUrl = link?.meeting_url ?? null;
  }
  return { ...item, meetingUrl };
}

// ---- writes: always through the database functions (they lock the slot and check who may do what) ----

export async function cancelSession(requestId: string, reason?: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("cancel_session", { p_request_id: requestId, p_reason: reason });
  if (error) throw error;
}

export async function acceptRequest(requestId: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("accept_request", { p_request_id: requestId });
  if (error) throw error;
}

export async function declineRequest(requestId: string, reason?: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("decline_request", { p_request_id: requestId, p_reason: reason });
  if (error) throw error;
}
