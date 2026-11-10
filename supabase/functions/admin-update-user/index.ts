// admin-update-user: an admin changes a user's login email.
// (Name, role and active flag are changed straight on the profiles table: RLS lets admins do that,
//  and database triggers write the activity log.)
//
// Body: { user_id, email }
import { requireCaller } from "../_shared/auth.ts";
import { cleanEmail, HttpError, json, readBody, requireUuid, serve } from "../_shared/http.ts";

serve(async (req) => {
  const caller = await requireCaller(req, ["admin"]);
  const body = await readBody<{ user_id?: unknown; email?: unknown }>(req);
  const userId = requireUuid(body.user_id, "The user");
  const email = cleanEmail(body.email);
  const admin = caller.admin;

  const { data: profile } = await admin.from("profiles").select("id, name, deleted_at").eq("id", userId).maybeSingle();
  if (!profile || profile.deleted_at) throw new HttpError(404, "User not found");

  const { data: current } = await admin.auth.admin.getUserById(userId);
  const oldEmail = current?.user?.email ?? null;
  if (oldEmail && oldEmail.toLowerCase() === email) return json({ ok: true, unchanged: true });

  // email_confirm: true because an admin is vouching for the address; the user can sign in with it straight away.
  const { error } = await admin.auth.admin.updateUserById(userId, { email, email_confirm: true });
  if (error) {
    if (/already|registered|exists|duplicate/i.test(error.message)) {
      throw new HttpError(409, "Another user already uses this email");
    }
    console.error("updateUserById failed", error);
    throw new HttpError(400, "Could not change the email");
  }

  await admin.rpc("log_admin_action", {
    p_action: "user.change_email",
    p_target_type: "user",
    p_target_id: userId,
    p_details: { name: profile.name, from: oldEmail, to: email },
    p_admin_id: caller.id,
  });

  return json({ ok: true });
});
