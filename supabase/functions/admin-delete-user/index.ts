// admin-delete-user: delete a user. Hard delete only when nothing refers to them,
// otherwise a soft delete (see _shared/delete-user.ts).
//
// Body: { user_id }
import { requireCaller } from "../_shared/auth.ts";
import { deleteUserAccount } from "../_shared/delete-user.ts";
import { HttpError, json, readBody, requireUuid, serve } from "../_shared/http.ts";

serve(async (req) => {
  const caller = await requireCaller(req, ["admin"]);
  const body = await readBody<{ user_id?: unknown }>(req);
  const userId = requireUuid(body.user_id, "The user");
  if (userId === caller.id) throw new HttpError(400, "You cannot delete your own account here");

  const result = await deleteUserAccount(caller.admin, userId);

  await caller.admin.rpc("log_admin_action", {
    p_action: "user.delete",
    p_target_type: "user",
    p_target_id: userId,
    p_details: { mode: result.mode, name: result.name, email: result.email },
    p_admin_id: caller.id,
  });

  return json({ ok: true, mode: result.mode });
});
