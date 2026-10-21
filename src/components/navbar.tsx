import Link from "next/link";
import { Bell, MessageSquare } from "lucide-react";
import { getCurrentUser, HOME_BY_LEVEL, type AccessLevel } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Avatar } from "@/components/ui/avatar";
import { buttonVariants } from "@/components/ui/button";

const LINKS: Record<AccessLevel, { href: string; label: string }[]> = {
  student: [
    { href: "/student", label: "Home" },
    { href: "/careers", label: "Careers" },
    { href: "/student/requests", label: "Requests" },
    { href: "/student/sessions", label: "Sessions" },
    { href: "/courses", label: "Courses" },
    { href: "/student/peers", label: "Peers" },
  ],
  professional: [
    { href: "/pro", label: "Home" },
    { href: "/pro/availability", label: "Availability" },
    { href: "/pro/requests", label: "Requests" },
    { href: "/pro/mentees", label: "Mentees" },
    { href: "/pro/sessions", label: "Sessions" },
  ],
  admin: [
    { href: "/admin", label: "Dashboard" },
    { href: "/admin/users", label: "Users" },
    { href: "/admin/roles", label: "Roles" },
    { href: "/admin/verification", label: "Verification" },
    { href: "/admin/availability", label: "Availability" },
    { href: "/admin/requests", label: "Requests" },
    { href: "/admin/reports", label: "Reports" },
  ],
};

async function signOut() {
  "use server";
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

/**
 * Role-aware navigation. Unread counts for the bell and messages icon are wired
 * on Day 7 (notifications) and Day 8 (messages); the icons are already in place.
 */
export async function Navbar() {
  const user = await getCurrentUser();

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4">
        <Link href={user ? HOME_BY_LEVEL[user.accessLevel] : "/"} className="text-lg font-bold text-primary">
          Nexa
        </Link>

        {user && (
          <nav className="hidden flex-1 items-center gap-1 overflow-x-auto md:flex" aria-label="Main">
            {LINKS[user.accessLevel].map((l) => (
              <Link key={l.href} href={l.href} className="rounded-md px-3 py-1.5 text-sm hover:bg-accent">
                {l.label}
              </Link>
            ))}
          </nav>
        )}
        {!user && <div className="flex-1" />}

        {user ? (
          <div className="flex items-center gap-1">
            {user.accessLevel !== "admin" && (
              <Link href="/messages" aria-label="Messages" className={buttonVariants({ variant: "ghost", size: "icon" })}>
                <MessageSquare className="h-5 w-5" />
              </Link>
            )}
            <Link href="/notifications" aria-label="Notifications" className={buttonVariants({ variant: "ghost", size: "icon" })}>
              <Bell className="h-5 w-5" />
            </Link>
            <details className="relative">
              <summary className="flex cursor-pointer list-none items-center rounded-full">
                <Avatar name={user.name} />
              </summary>
              <div className="absolute right-0 mt-2 w-52 rounded-md border bg-card p-1 shadow-md">
                <p className="truncate px-3 py-2 text-sm font-medium">{user.name}</p>
                <p className="truncate px-3 pb-2 text-xs text-muted-foreground">{user.roleName}</p>
                {user.accessLevel !== "admin" && (
                  <Link
                    href={user.accessLevel === "student" ? "/student/settings" : "/pro/settings"}
                    className="block rounded-md px-3 py-2 text-sm hover:bg-accent"
                  >
                    Profile &amp; settings
                  </Link>
                )}
                <form action={signOut}>
                  <button type="submit" className="w-full rounded-md px-3 py-2 text-left text-sm hover:bg-accent">
                    Sign out
                  </button>
                </form>
              </div>
            </details>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Link href="/login" className={buttonVariants({ variant: "ghost" })}>
              Log in
            </Link>
            <Link href="/signup" className={buttonVariants()}>
              Sign up
            </Link>
          </div>
        )}
      </div>

      {user && (
        <nav className="flex gap-1 overflow-x-auto border-t px-2 py-1 md:hidden" aria-label="Main (mobile)">
          {LINKS[user.accessLevel].map((l) => (
            <Link key={l.href} href={l.href} className="whitespace-nowrap rounded-md px-3 py-1.5 text-sm hover:bg-accent">
              {l.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
