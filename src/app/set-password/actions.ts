"use server";

import { getCurrentUser, HOME_BY_LEVEL } from "@/lib/auth";

/** After the password is set, where this person belongs. Falls back to the login page. */
export async function homePathAction(): Promise<string> {
  const user = await getCurrentUser();
  return user ? HOME_BY_LEVEL[user.accessLevel] : "/login";
}
