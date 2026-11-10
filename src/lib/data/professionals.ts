import "server-only";
import { createClient } from "@/lib/supabase/server";
import { rangeFor } from "@/lib/pagination";

export type PublicProfessional = {
  id: string;
  name: string;
  careerId: string;
  careerName: string;
  bio: string | null;
  experienceYears: number | null;
  nextOpenSlot: string | null;
};

type Row = {
  id: string | null;
  name: string | null;
  career_id: string | null;
  career_name: string | null;
  bio: string | null;
  experience_years: number | null;
  next_open_slot: string | null;
};

const COLUMNS = "id, name, career_id, career_name, bio, experience_years, next_open_slot";

function map(r: Row): PublicProfessional {
  return {
    id: r.id as string,
    name: r.name as string,
    careerId: r.career_id as string,
    careerName: r.career_name as string,
    bio: r.bio,
    experienceYears: r.experience_years,
    nextOpenSlot: r.next_open_slot,
  };
}

/** Verified professionals of one career (view public_professionals), soonest availability first. */
export async function listProfessionalsByCareer(careerId: string, opts: { page?: number; pageSize?: number } = {}): Promise<{ professionals: PublicProfessional[]; total: number }> {
  const supabase = await createClient();
  const size = opts.pageSize ?? 12;
  const { from, to } = rangeFor(opts.page ?? 1, size);
  const { data, error, count } = await supabase
    .from("public_professionals")
    .select(COLUMNS, { count: "exact" })
    .eq("career_id", careerId)
    .order("next_open_slot", { ascending: true, nullsFirst: false })
    .order("name")
    .range(from, to);
  if (error) throw new Error(`Could not load professionals: ${error.message}`);
  return { total: count ?? 0, professionals: (data ?? []).map(map) };
}

export async function getPublicProfessional(id: string): Promise<PublicProfessional | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("public_professionals").select(COLUMNS).eq("id", id).maybeSingle();
  if (error) throw new Error(`Could not load the professional: ${error.message}`);
  return data ? map(data) : null;
}

export type OpenSlot = { id: string; startTime: string; endTime: string };

/**
 * Upcoming open slots of one professional. RLS only returns open slots of verified, active
 * professionals, and the meeting link is not part of what this query may read.
 */
export async function listOpenSlots(professionalId: string, limit = 60): Promise<OpenSlot[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("availability_slots")
    .select("id, start_time, end_time")
    .eq("professional_id", professionalId)
    .eq("status", "open")
    .gt("start_time", new Date().toISOString())
    .order("start_time")
    .limit(limit);
  if (error) throw new Error(`Could not load availability: ${error.message}`);
  return (data ?? []).map((s) => ({ id: s.id, startTime: s.start_time, endTime: s.end_time }));
}

/** Slot ids of this professional that the signed-in student already has a pending request on. */
export async function listMyPendingSlotIds(professionalId: string): Promise<string[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("mentorship_requests")
    .select("availability_slot_id")
    .eq("professional_id", professionalId)
    .eq("status", "pending");
  if (error) throw new Error(`Could not load your requests: ${error.message}`);
  return (data ?? []).map((r) => r.availability_slot_id);
}

/** Creates a request through the database function (the only way to write a request). Returns its id. */
export async function requestSession(slotId: string, message?: string): Promise<string> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("request_session", { p_slot_id: slotId, p_message: message });
  if (error) throw error;
  return data as string;
}
