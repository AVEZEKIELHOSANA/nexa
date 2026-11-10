// admin-create-user: an admin invites a person by email with a chosen role.
// The person receives the invite email and sets their own password on /set-password.
//
// Body: { email, name, role_id, date_of_birth? (student roles, 18+), career_id? (professional roles) }
//
// How the role gets onto the new account safely: the user is created with the SERVICE ROLE and the
// role goes into app_metadata ("nexa_invite"), which only the server can write. The sign-up trigger
// (handle_new_user, Day 4 migration) trusts app_metadata and ignores anything a visitor puts in
// their own sign-up metadata. Then the standard Supabase invite email is sent.
import { requireCaller, serviceClient } from "../_shared/auth.ts";
import { cleanEmail, HttpError, json, readBody, requireUuid, serve, siteUrl } from "../_shared/http.ts";

serve(async (req) => {
  const caller = await requireCaller(req, ["admin"]);
  const body = await readBody<{
    email?: unknown; name?: unknown; role_id?: unknown; date_of_birth?: unknown; career_id?: unknown;
  }>(req);

  const email = cleanEmail(body.email);
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (name.length < 1 || name.length > 100) throw new HttpError(400, "Enter a name (1 to 100 characters)");
  const roleId = requireUuid(body.role_id, "The role");
  const admin = caller.admin ?? serviceClient();

  const { data: role } = await admin.from("roles").select("id, name, access_level").eq("id", roleId).maybeSingle();
  if (!role) throw new HttpError(400, "That role does not exist");

  const invite: Record<string, string> = { role_id: role.id };

  if (role.access_level === "student") {
    const dob = typeof body.date_of_birth === "string" ? body.date_of_birth : "";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dob) || Number.isNaN(Date.parse(dob))) {
      throw new HttpError(400, "Enter the student's date of birth");
    }
    const eighteen = new Date();
    eighteen.setFullYear(eighteen.getFullYear() - 18);
    if (new Date(dob) > eighteen) {
      throw new HttpError(400, "Invited students must be 18 or older. Under-18s sign up themselves so their guardian can consent.");
    }
    invite.date_of_birth = dob;
  } else if (role.access_level === "professional") {
    const careerId = requireUuid(body.career_id, "The career");
    const { data: career } = await admin.from("careers").select("id").eq("id", careerId).eq("is_active", true).maybeSingle();
    if (!career) throw new HttpError(400, "Choose an active career for this professional");
    invite.career_id = careerId;
  }

  const redirectTo = `${siteUrl()}/set-password`;

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    email_confirm: false,
    user_metadata: { name },
    app_metadata: { nexa_invite: invite },
  });
  if (createError || !created.user) {
    const msg = createError?.message ?? "";
    if (/already|registered|exists/i.test(msg)) throw new HttpError(409, "A user with this email already exists");
    console.error("createUser failed", createError);
    throw new HttpError(400, "Could not create the user. Check the details and try again.");
  }
  const userId = created.user.id;

  // Sends the invite email (custom SMTP / Resend). On an existing, unconfirmed user this (re)sends the invite.
  const { error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, { redirectTo });
  if (inviteError) {
    await admin.auth.admin.deleteUser(userId);        // roll back: do not leave a user nobody can sign in as
    console.error("inviteUserByEmail failed", inviteError);
    throw new HttpError(502, "The invitation email could not be sent. Check the email settings and try again.");
  }

  await admin.rpc("log_admin_action", {
    p_action: "user.invite",
    p_target_type: "user",
    p_target_id: userId,
    p_details: { email, name, role: role.name },
    p_admin_id: caller.id,
  });

  return json({ ok: true, user_id: userId });
});
