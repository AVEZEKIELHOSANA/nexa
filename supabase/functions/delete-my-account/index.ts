// delete-my-account: a student or professional deletes THEIR OWN account.
// Same rules as the admin version (see _shared/delete-user.ts): open sessions are closed first, a
// hard delete happens only when nothing refers to the person, otherwise the account is anonymised
// and the login blocked. Administrators cannot use this (ask another admin; the last admin is protected).
//
// Body: { confirm: "DELETE" }   (the typed confirmation is checked here as well as in the page)
import { requireCaller } from "../_shared/auth.ts";
import { deleteUserAccount } from "../_shared/delete-user.ts";
import { HttpError, json, readBody, serve } from "../_shared/http.ts";

serve(async (req) => {
  const caller = await requireCaller(req, ["student", "professional"]);
  const body = await readBody<{ confirm?: unknown }>(req);
  if (body.confirm !== "DELETE") throw new HttpError(400, "Type DELETE to confirm");

  const result = await deleteUserAccount(caller.admin, caller.id);

  // Recorded without a name or email: the person asked to be forgotten.
  await caller.admin.rpc("log_admin_action", {
    p_action: "account.self_delete",
    p_target_type: "user",
    p_target_id: caller.id,
    p_details: { mode: result.mode, access_level: caller.accessLevel },
    p_admin_id: null,
  });

  return json({ ok: true, mode: result.mode });
});
