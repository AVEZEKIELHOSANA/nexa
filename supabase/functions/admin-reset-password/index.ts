// admin-reset-password: sends a password-reset email to a user.
// The link lands on /set-password, where the person chooses a new password.
//
// Body: { user_id }
//
// The reset email is requested with an ANON client using the implicit flow, so the link does not
// depend on a code verifier stored in the (admin's) browser.
import { createClient } from "npm:@supabase/supabase-js@2";
import { requireCaller } from "../_shared/auth.ts";
import { HttpError, json, readBody, requireUuid, serve, siteUrl } from "../_shared/http.ts";

serve(async (req) => {
  const caller = await requireCaller(req, ["admin"]);
  const body = await readBody<{ user_id?: unknown }>(req);
  const userId = requireUuid(body.user_id, "The user");

  const { data: profile } = await caller.admin
    .from("profiles").select("id, name, is_active, deleted_at").eq("id", userId).maybeSingle();
  if (!profile || profile.deleted_at) throw new HttpError(404, "User not found");

  const { data: authUser } = await caller.admin.auth.admin.getUserById(userId);
  const email = authUser?.user?.email;
  if (!email) throw new HttpError(404, "This user has no email address");

  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!url || !anonKey) throw new HttpError(500, "Supabase environment is not configured");

  const anon = createClient(url, anonKey, {
    auth: { flowType: "implicit", persistSession: false, autoRefreshToken: false },
  });
  const { error } = await anon.auth.resetPasswordForEmail(email, { redirectTo: `${siteUrl()}/set-password` });
  if (error) {
    console.error("resetPasswordForEmail failed", error);
    throw new HttpError(502, "The reset email could not be sent. Wait a minute and try again.");
  }

  await caller.admin.rpc("log_admin_action", {
    p_action: "user.reset_password",
    p_target_type: "user",
    p_target_id: userId,
    p_details: { name: profile.name },
    p_admin_id: caller.id,
  });

  return json({ ok: true });
});
