import "server-only";
import { createClient } from "@/lib/supabase/server";
import { PAGE_SIZE, rangeFor } from "@/lib/pagination";

export type SlotStatus = "open" | "booked" | "cancelled";

export type ManagedSlot = {
  id: string;
  startTime: string;
  endTime: string;
  status: SlotStatus;
  meetingUrl: string | null;
  /** pending requests waiting on this slot (open slots) */
  pendingRequests: number;
  /** the accepted request holding this slot (booked slots) */
  booking: { requestId: string; studentName: string } | null;
};

export type SlotInput = { startTime: string; endTime: string; meetingUrl?: string | null };

/**
 * Slots of one professional, for the professional's own screen and for the admin screen (RLS lets
 * each see what they may). Open and booked show upcoming ones only; the list is paginated.
 */
export async function listSlotsOf(
  professionalId: string,
  opts: { status: SlotStatus; page?: number; pageSize?: number }
): Promise<{ slots: ManagedSlot[]; total: number }> {
  const supabase = await createClient();
  const size = opts.pageSize ?? PAGE_SIZE;
  const { from, to } = rangeFor(opts.page ?? 1, size);

  let query = supabase
    .from("availability_slots")
    .select("id, start_time, end_time, status", { count: "exact" })
    .eq("professional_id", professionalId)
    .eq("status", opts.status)
    .range(from, to);
  if (opts.status === "open") query = query.gt("start_time", new Date().toISOString()).order("start_time");
  else if (opts.status === "booked") query = query.gt("end_time", new Date().toISOString()).order("start_time");
  else query = query.order("start_time", { ascending: false });

  const { data, error, count } = await query;
  if (error) throw new Error(`Could not load slots: ${error.message}`);
  const rows = data ?? [];
  const ids = rows.map((r) => r.id);
  if (ids.length === 0) return { slots: [], total: count ?? 0 };

  const [links, requests] = await Promise.all([
    supabase.from("slot_links").select("slot_id, meeting_url").in("slot_id", ids),
    supabase
      .from("mentorship_requests")
      .select("id, status, availability_slot_id, student_id")
      .in("availability_slot_id", ids)
      .in("status", ["pending", "accepted"]),
  ]);
  if (links.error) throw new Error(`Could not load meeting links: ${links.error.message}`);
  if (requests.error) throw new Error(`Could not load requests: ${requests.error.message}`);

  const linkBySlot = new Map((links.data ?? []).map((l) => [l.slot_id as string, l.meeting_url]));
  const accepted = (requests.data ?? []).filter((r) => r.status === "accepted");
  const studentIds = [...new Set(accepted.map((r) => r.student_id))];
  const names = new Map<string, string>();
  if (studentIds.length > 0) {
    const { data: profiles } = await supabase.from("profiles").select("id, name").in("id", studentIds);
    for (const p of profiles ?? []) names.set(p.id, p.name);
  }

  return {
    total: count ?? 0,
    slots: rows.map((r) => {
      const booking = accepted.find((q) => q.availability_slot_id === r.id);
      return {
        id: r.id,
        startTime: r.start_time,
        endTime: r.end_time,
        status: r.status as SlotStatus,
        meetingUrl: linkBySlot.get(r.id) ?? null,
        pendingRequests: (requests.data ?? []).filter((q) => q.status === "pending" && q.availability_slot_id === r.id).length,
        booking: booking ? { requestId: booking.id, studentName: names.get(booking.student_id) ?? "Student" } : null,
      };
    }),
  };
}

export async function countSlotsByStatus(professionalId: string): Promise<Record<SlotStatus, number>> {
  const supabase = await createClient();
  const result: Record<SlotStatus, number> = { open: 0, booked: 0, cancelled: 0 };
  await Promise.all(
    (Object.keys(result) as SlotStatus[]).map(async (status) => {
      let q = supabase.from("availability_slots").select("id", { count: "exact", head: true }).eq("professional_id", professionalId).eq("status", status);
      if (status === "open") q = q.gt("start_time", new Date().toISOString());
      if (status === "booked") q = q.gt("end_time", new Date().toISOString());
      const { count } = await q;
      result[status] = count ?? 0;
    })
  );
  return result;
}

export async function createSlot(professionalId: string, input: SlotInput): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("availability_slots").insert({
    professional_id: professionalId,
    start_time: input.startTime,
    end_time: input.endTime,
    meeting_url: input.meetingUrl || null,
  });
  if (error) throw error;
}

export async function updateSlot(slotId: string, input: Partial<SlotInput>): Promise<void> {
  const supabase = await createClient();
  const patch: { start_time?: string; end_time?: string; meeting_url?: string | null } = {};
  if (input.startTime !== undefined) patch.start_time = input.startTime;
  if (input.endTime !== undefined) patch.end_time = input.endTime;
  if (input.meetingUrl !== undefined) patch.meeting_url = input.meetingUrl || null;
  const { data, error } = await supabase.from("availability_slots").update(patch).eq("id", slotId).select("id");
  if (error) throw error;
  if (!data || data.length === 0) throw new Error("This slot can no longer be edited.");
}

/** Owner removes one of their open slots. Returns "deleted", or "cancelled" when requests still reference it. */
export async function deleteOpenSlot(slotId: string): Promise<"deleted" | "cancelled"> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("delete_open_slot", { p_slot_id: slotId });
  if (error) throw error;
  return data as "deleted" | "cancelled";
}

export async function adminDeleteSlot(slotId: string): Promise<"deleted" | "cancelled"> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_delete_slot", { p_slot_id: slotId });
  if (error) throw error;
  return data as "deleted" | "cancelled";
}

export type SlotImpact = { requestId: string; status: "pending" | "accepted"; studentName: string };

/** Requests that deleting this slot will decline (pending) or cancel (accepted). Admin only (RLS). */
export async function getSlotImpact(slotId: string): Promise<SlotImpact[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("mentorship_requests")
    .select("id, status, student_id")
    .eq("availability_slot_id", slotId)
    .in("status", ["pending", "accepted"]);
  if (error) throw new Error(`Could not check the slot's requests: ${error.message}`);
  const rows = data ?? [];
  if (rows.length === 0) return [];
  const { data: profiles } = await supabase.from("profiles").select("id, name").in("id", rows.map((r) => r.student_id));
  const names = new Map((profiles ?? []).map((p) => [p.id, p.name]));
  return rows.map((r) => ({ requestId: r.id, status: r.status as "pending" | "accepted", studentName: names.get(r.student_id) ?? "Student" }));
}

/** Verified, active professionals for the admin's picker (the pilot is small; capped at 200). */
// Find the bottom of the file where listVerifiedProfessionalOptions is
export async function listVerifiedProfessionalOptions(): Promise<{ id: string; name: string; careerName: string }[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_list_professionals", { p_status: "verified", p_page: 1, p_page_size: 200 });
  if (error) throw new Error(`Could not load professionals: ${error.message}`);
  
  // FIXED HERE: Changed (p: any) to (p: Record<string, unknown>)
  return (data ?? [])
    .filter((p: Record<string, unknown>) => p.is_active)
    .map((p: Record<string, unknown>) => ({ id: p.user_id as string, name: p.name as string, careerName: p.career_name as string }))
    .sort((a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name));
}
