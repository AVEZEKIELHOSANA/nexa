import "server-only";
import { createClient } from "@/lib/supabase/server";
import { PAGE_SIZE } from "@/lib/pagination";

export type VerificationStatus = "pending" | "verified" | "rejected";

export type ProfessionalApplication = {
  userId: string;
  name: string;
  email: string | null;
  isActive: boolean;
  careerId: string;
  careerName: string;
  experienceYears: number | null;
  bio: string | null;
  hasCredentials: boolean;
  status: VerificationStatus;
  rejectionReason: string | null;
  verifiedAt: string | null;
  appliedAt: string;
};

export async function listProfessionals(opts: {
  status?: VerificationStatus;
  search?: string;
  careerId?: string;
  page?: number;
  pageSize?: number;
}): Promise<{ professionals: ProfessionalApplication[]; total: number }> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_list_professionals", {
    p_status: opts.status,
    p_search: opts.search,
    p_career_id: opts.careerId,
    p_page: opts.page ?? 1,
    p_page_size: opts.pageSize ?? PAGE_SIZE,
  });
  if (error) throw new Error(`Could not load professionals: ${error.message}`);
  const rows = data ?? [];
  return {
    total: Number(rows[0]?.total_count ?? 0),
    // FIXED HERE: Changed (r: any) to (r: unknown) and casted to Record
    professionals: rows.map((r: unknown) => {
      const row = r as Record<string, unknown>;
      return {
        userId: row.user_id as string,
        name: row.name as string,
        email: (row.email as string | null) ?? null,
        isActive: row.is_active as boolean,
        careerId: row.career_id as string,
        careerName: row.career_name as string,
        experienceYears: (row.experience_years as number | null) ?? null,
        bio: (row.bio as string | null) ?? null,
        hasCredentials: row.has_credentials as boolean,
        status: row.verification_status as VerificationStatus,
        rejectionReason: (row.rejection_reason as string | null) ?? null,
        verifiedAt: (row.verified_at as string | null) ?? null,
        appliedAt: row.applied_at as string,
      };
    }),
  };
}

/** Counts for the tab badges. */
export async function countByStatus(): Promise<Record<VerificationStatus, number>> {
  const supabase = await createClient();
  const result: Record<VerificationStatus, number> = { pending: 0, verified: 0, rejected: 0 };
  await Promise.all(
    (Object.keys(result) as VerificationStatus[]).map(async (status) => {
      const { count } = await supabase
        .from("professional_profiles")
        .select("user_id", { count: "exact", head: true })
        .eq("verification_status", status);
      result[status] = count ?? 0;
    })
  );
  return result;
}

export async function verifyProfessional(userId: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("verify_professional", { p_user_id: userId });
  if (error) throw error;
}

export async function rejectProfessional(userId: string, reason: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("reject_professional", { p_user_id: userId, p_reason: reason });
  if (error) throw error;
}

/**
 * A short-lived (2 minute) link to the professional's credentials file. The bucket is private; the
 * storage policy lets only the owner and admins create it.
 */
export async function getCredentialsUrl(userId: string): Promise<string> {
  const supabase = await createClient();
  const { data: pro, error } = await supabase
    .from("professional_profiles")
    .select("credentials_path")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!pro?.credentials_path) throw new Error("This professional has not uploaded credentials yet.");

  const { data, error: urlError } = await supabase.storage.from("credentials").createSignedUrl(pro.credentials_path, 120);
  if (urlError || !data) throw new Error("Could not open the credentials file.");
  return data.signedUrl;
}