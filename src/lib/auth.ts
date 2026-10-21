import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type AccessLevel = "student" | "professional" | "admin";

export type CurrentUser = {
  id: string;
  email: string | undefined;
  name: string;
  isActive: boolean;
  accessLevel: AccessLevel;
  roleName: string;
};

/** Where each access level lands after login. */
export const HOME_BY_LEVEL: Record<AccessLevel, string> = {
  student: "/student",
  professional: "/pro",
  admin: "/admin",
};

/**
 * The signed-in user with their access level, or null. Cached per request, so
 * calling it from a layout and a page costs one query. Uses getUser(), which
 * re-validates the token with Supabase.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("name, is_active, deleted_at, roles(name, access_level)")
    .eq("id", user.id)
    .maybeSingle();

  // Signed in but no readable profile (e.g. deleted account): treat as signed out.
  if (!profile || profile.deleted_at || !profile.roles) return null;

  return {
    id: user.id,
    email: user.email,
    name: profile.name,
    isActive: profile.is_active,
    accessLevel: profile.roles.access_level as AccessLevel,
    roleName: profile.roles.name,
  };
});

/**
 * Use at the top of a section layout. Sends visitors to /login and sends users
 * of another level to their own home. RLS still protects the data itself; this
 * only decides which pages a person sees.
 */
export async function requireAccessLevel(level: AccessLevel): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.isActive) redirect("/login?notice=inactive");
  if (user.accessLevel !== level) redirect(HOME_BY_LEVEL[user.accessLevel]);
  return user;
}
