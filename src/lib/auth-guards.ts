import "server-only";
import { redirect } from "next/navigation";
import { getCurrentUser, type AccessLevel, type CurrentUser } from "@/lib/auth";

/**
 * For Server Actions. A layout's guard does NOT protect a Server Action (anyone can POST to it),
 * so every action starts with this. Throws instead of redirecting: the action's try/catch turns
 * it into an error toast. Row Level Security remains the real protection for the data.
 */
export async function assertAccessLevel(...levels: AccessLevel[]): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user || !user.isActive) throw new Error("Please sign in again.");
  if (!levels.includes(user.accessLevel)) throw new Error("You are not allowed to do this.");
  return user;
}

/** For pages shared by several roles (messages, notifications): signed in, active, one of these levels. */
export async function requireAnyAccessLevel(...levels: AccessLevel[]): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.isActive) redirect("/login?notice=inactive");
  if (!levels.includes(user.accessLevel)) {
    redirect(user.accessLevel === "admin" ? "/admin" : user.accessLevel === "professional" ? "/pro" : "/student");
  }
  return user;
}
