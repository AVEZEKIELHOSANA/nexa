import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";
import { HttpError } from "./http.ts";

export type AccessLevel = "student" | "professional" | "admin";

export type Caller = {
  id: string;
  accessLevel: AccessLevel;
  /** Service-role client: bypasses RLS. Only ever used after the caller has been checked. */
  admin: SupabaseClient;
};

/** Service-role client. The key exists only inside Edge Functions, never in the browser. */
export function serviceClient(): SupabaseClient {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new HttpError(500, "Supabase environment is not configured");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

/**
 * Confirms who is calling and that their access level is allowed, as the spec requires
 * ("each one first confirms the caller's access level"). The token is checked with the
 * Auth server, so this is safe to use with `--no-verify-jwt`.
 */
export async function requireCaller(req: Request, allowed: AccessLevel[]): Promise<Caller> {
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  if (!token) throw new HttpError(401, "You must be signed in");

  const admin = serviceClient();
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) throw new HttpError(401, "Your session is not valid. Sign in again.");

  const { data: profile } = await admin
    .from("profiles")
    .select("is_active, deleted_at, roles(access_level)")
    .eq("id", data.user.id)
    .maybeSingle();

  const role = Array.isArray(profile?.roles) ? profile?.roles[0] : profile?.roles;
  const level = role?.access_level as AccessLevel | undefined;
  if (!profile || !profile.is_active || profile.deleted_at || !level) {
    throw new HttpError(403, "Your account is not active");
  }
  if (!allowed.includes(level)) throw new HttpError(403, "You are not allowed to do this");

  return { id: data.user.id, accessLevel: level, admin };
}
