import "server-only";
import { createClient } from "@/lib/supabase/server";
import { invokeEdge } from "@/lib/data/edge";

export type NotificationPrefs = { messages: boolean; reminders: boolean; peers: boolean };

export async function updateMyName(userId: string, name: string): Promise<void> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("profiles").update({ name }).eq("id", userId).select("id");
  if (error) throw error;
  if (!data || data.length === 0) throw new Error("Your profile could not be updated.");
}

// ---------------- students ----------------
export type StudentSettings = {
  bio: string;
  interestIds: string[];
  prefs: NotificationPrefs;
  isMinor: boolean;
  guardianConsentAt: string | null;
};

export async function getStudentSettings(userId: string): Promise<StudentSettings> {
  const supabase = await createClient();
  const [profile, interests] = await Promise.all([
    supabase.from("student_profiles").select("bio, notification_prefs, date_of_birth, guardian_consent_at").eq("user_id", userId).maybeSingle(),
    supabase.from("student_career_interests").select("career_id").eq("student_id", userId),
  ]);
  if (profile.error) throw new Error(`Could not load your settings: ${profile.error.message}`);
  if (interests.error) throw new Error(`Could not load your interests: ${interests.error.message}`);
  const row = profile.data;
  const raw = (row?.notification_prefs ?? {}) as Record<string, unknown>;
  const eighteen = new Date();
  eighteen.setFullYear(eighteen.getFullYear() - 18);
  return {
    bio: row?.bio ?? "",
    interestIds: (interests.data ?? []).map((i) => i.career_id),
    prefs: {
      messages: raw.messages !== false,
      reminders: raw.reminders !== false,
      peers: raw.peers !== false,
    },
    isMinor: row ? new Date(row.date_of_birth) > eighteen : false,
    guardianConsentAt: row?.guardian_consent_at ?? null,
  };
}

export async function saveStudentSettings(input: { bio: string; interestIds: string[]; prefs: NotificationPrefs }): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("update_my_student_settings", { p_bio: input.bio, p_interest_ids: input.interestIds, p_prefs: input.prefs });
  if (error) throw error;
}

// ---------------- professionals ----------------
export type ProfessionalSettings = {
  bio: string;
  experienceYears: number | null;
  careerId: string;
  credentialsPath: string | null;
  status: "pending" | "verified" | "rejected";
  rejectionReason: string | null;
};

export async function getProfessionalSettings(userId: string): Promise<ProfessionalSettings | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("professional_profiles")
    .select("bio, experience_years, career_id, credentials_path, verification_status, rejection_reason")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(`Could not load your profile: ${error.message}`);
  if (!data) return null;
  return {
    bio: data.bio ?? "",
    experienceYears: data.experience_years,
    careerId: data.career_id,
    credentialsPath: data.credentials_path,
    status: data.verification_status as ProfessionalSettings["status"],
    rejectionReason: data.rejection_reason,
  };
}

export async function saveProfessionalDetails(userId: string, input: { bio: string; experienceYears: number | null; careerId: string }): Promise<void> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("professional_profiles")
    .update({ bio: input.bio || null, experience_years: input.experienceYears, career_id: input.careerId })
    .eq("user_id", userId)
    .select("user_id");
  if (error) throw error;
  if (!data || data.length === 0) throw new Error("Your profile could not be updated.");
}

/**
 * Points the professional's profile at a file the browser already uploaded to their own folder, and
 * deletes the previous file. (A rejected application returns to "pending" by a database trigger.)
 */
export async function setCredentialsPath(userId: string, path: string): Promise<void> {
  const supabase = await createClient();
  const { data: before } = await supabase.from("professional_profiles").select("credentials_path").eq("user_id", userId).maybeSingle();
  const { data, error } = await supabase.from("professional_profiles").update({ credentials_path: path }).eq("user_id", userId).select("user_id");
  if (error) throw error;
  if (!data || data.length === 0) throw new Error("Your profile could not be updated.");
  if (before?.credentials_path && before.credentials_path !== path) {
    await supabase.storage.from("credentials").remove([before.credentials_path]); // best effort
  }
}

export async function getMyCredentialsUrl(userId: string): Promise<string> {
  const supabase = await createClient();
  const { data: pro } = await supabase.from("professional_profiles").select("credentials_path").eq("user_id", userId).maybeSingle();
  if (!pro?.credentials_path) throw new Error("You have not uploaded credentials yet.");
  const { data, error } = await supabase.storage.from("credentials").createSignedUrl(pro.credentials_path, 120);
  if (error || !data) throw new Error("Could not open your credentials file.");
  return data.signedUrl;
}

// ---------------- account deletion ----------------
export async function deleteMyAccount(): Promise<"hard" | "soft"> {
  const result = await invokeEdge<{ mode: "hard" | "soft" }>("delete-my-account", { confirm: "DELETE" });
  const supabase = await createClient();
  await supabase.auth.signOut(); // the login is gone or blocked; clear the cookies too
  return result.mode;
}
