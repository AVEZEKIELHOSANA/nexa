import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { HttpError } from "./http.ts";

export type DeleteResult = { mode: "hard" | "soft"; name: string; email: string | null };

/**
 * Shared by admin-delete-user and (Day 10) delete-my-account.
 *
 * - Anything the person still has open is closed first (close_user_activity, added on Day 6;
 *   skipped quietly if that migration has not been applied yet).
 * - HARD delete only when nothing in the database refers to the user (user_has_linked_records).
 * - Otherwise SOFT delete: deleted_at set, account deactivated, name anonymised, personal
 *   free-text and the credentials file removed, and the login banned so they can never sign in.
 *
 * The "last administrator" rule is enforced by a database trigger, for every caller.
 */
export async function deleteUserAccount(admin: SupabaseClient, userId: string): Promise<DeleteResult> {
  const { data: profile } = await admin
    .from("profiles")
    .select("id, name, deleted_at")
    .eq("id", userId)
    .maybeSingle();
  if (!profile) throw new HttpError(404, "User not found");
  if (profile.deleted_at) throw new HttpError(409, "This account was already deleted");

  // Fail early (before anything is closed) if this is the last active administrator.
  // The database trigger protect_last_admin enforces the same rule as the final guard.
  const { data: others } = await admin
    .from("profiles")
    .select("id, roles!inner(access_level)")
    .eq("roles.access_level", "admin")
    .eq("is_active", true)
    .is("deleted_at", null)
    .neq("id", userId)
    .limit(1);
  const { data: me } = await admin.from("profiles").select("roles(access_level)").eq("id", userId).maybeSingle();
  const myRole = Array.isArray(me?.roles) ? me?.roles[0] : me?.roles;
  if (myRole?.access_level === "admin" && (others?.length ?? 0) === 0) {
    throw new HttpError(409, "You cannot delete the last administrator");
  }

  const { data: authUser } = await admin.auth.admin.getUserById(userId);
  const email = authUser?.user?.email ?? null;

  // Close open sessions/slots (ignore "function does not exist": Day 6 not applied yet)
  const closed = await admin.rpc("close_user_activity", { p_user_id: userId });
  if (closed.error && closed.error.code !== "PGRST202" && closed.error.code !== "42883") {
    throw new HttpError(500, `Could not close the account's open sessions: ${closed.error.message}`);
  }

  const { data: linked, error: linkedError } = await admin.rpc("user_has_linked_records", { p_user_id: userId });
  if (linkedError) throw new HttpError(500, `Could not check linked records: ${linkedError.message}`);

  if (linked === false) {
    const { error } = await admin.auth.admin.deleteUser(userId);
    if (!error) return { mode: "hard", name: profile.name, email };
    // fall back to a soft delete if the hard delete was refused (e.g. last administrator is re-checked below)
    if (/last administrator/i.test(error.message)) throw new HttpError(409, "You cannot delete the last administrator");
  }

  // ---- soft delete ----
  const { data: pro } = await admin
    .from("professional_profiles")
    .select("credentials_path")
    .eq("user_id", userId)
    .maybeSingle();
  if (pro?.credentials_path) {
    await admin.storage.from("credentials").remove([pro.credentials_path]);
  }
  await admin.from("professional_profiles").update({ bio: null, credentials_path: null }).eq("user_id", userId);
  await admin.from("student_profiles").update({ bio: null, guardian_email: null }).eq("user_id", userId);

  const { error: profileError } = await admin
    .from("profiles")
    .update({ deleted_at: new Date().toISOString(), is_active: false, name: "Deleted user" })
    .eq("id", userId);
  if (profileError) {
    if (/last administrator/i.test(profileError.message)) throw new HttpError(409, "You cannot delete the last administrator");
    throw new HttpError(500, `Could not delete the account: ${profileError.message}`);
  }

  const { error: banError } = await admin.auth.admin.updateUserById(userId, { ban_duration: "876000h" });
  if (banError) throw new HttpError(500, `The account was anonymised but the login could not be blocked: ${banError.message}`);

  return { mode: "soft", name: profile.name, email };
}
