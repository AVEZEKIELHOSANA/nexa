import "server-only";
import { createClient } from "@/lib/supabase/server";

export type MyProfessionalStatus = {
  status: "pending" | "verified" | "rejected";
  rejectionReason: string | null;
  hasCredentials: boolean;
};

/** The signed-in professional's own verification state (RLS: they can read their own row). */
export async function getMyProfessionalStatus(userId: string): Promise<MyProfessionalStatus | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("professional_profiles")
    .select("verification_status, rejection_reason, credentials_path")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(`Could not load your profile: ${error.message}`);
  if (!data) return null;
  return {
    status: data.verification_status as MyProfessionalStatus["status"],
    rejectionReason: data.rejection_reason,
    hasCredentials: !!data.credentials_path,
  };
}
