import Link from "next/link";
import { MessageSquare } from "lucide-react";
import { getCurrentUser, HOME_BY_LEVEL, type AccessLevel } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Avatar } from "@/components/ui/avatar";
import { NotificationBell } from "@/components/notification-bell";
import { buttonVariants } from "@/components/ui/button";
import { getUnreadMessageCount } from "@/lib/data/messages";
import { getUnreadNotificationCount } from "@/lib/data/notifications";

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
    { href: "/admin/careers", label: "Careers" },
    { href: "/admin/courses", label: "Courses" },
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
 * Role-aware navigation. The bell (Day 7) and the messages icon (Day 8) show unread counts.
 * Admins get neither: they receive no notifications and have no conversations of their own.
 */
export async function Navbar() {
  const user = await getCurrentUser();
  const showCounters = !!user && user.accessLevel !== "admin";
  const [unreadNotifications, unreadMessages] = showCounters ? await Promise.all([getUnreadNotificationCount(), getUnreadMessageCount()]) : [0, 0];

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
            {showCounters && (
              <>
                <Link
                  href="/messages"
                  aria-label={unreadMessages > 0 ? `Messages, ${unreadMessages} unread` : "Messages"}
                  className={buttonVariants({ variant: "ghost", size: "icon" }) + " relative"}
                >
                  <MessageSquare className="h-5 w-5" />
                  {unreadMessages > 0 && (
                    <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold leading-none text-destructive-foreground">
                      {unreadMessages > 99 ? "99+" : unreadMessages}
                    </span>
                  )}
                </Link>
                <NotificationBell userId={user.id} level={user.accessLevel} initialUnread={unreadNotifications} />
              </>
            )}
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
