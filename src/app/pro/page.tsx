import type { Metadata } from "next";
import Link from "next/link";
import { CalendarClock, CalendarPlus, CircleAlert, Inbox, MessageSquare, Users } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { SessionCard } from "@/components/session-card";
import { StatCard } from "@/components/stat-card";
import { Card, CardContent } from "@/components/ui/card";
import { requireAccessLevel } from "@/lib/auth";
import { getProfessionalDashboard } from "@/lib/data/dashboard";
import { getMyProfessionalStatus } from "@/lib/data/professional-self";

export const metadata: Metadata = { title: "Home" };

const SHORTCUTS = [
  { href: "/pro/availability", title: "My availability", text: "Add or change open times.", icon: CalendarPlus },
  { href: "/pro/requests", title: "Requests", text: "Accept or decline.", icon: Inbox },
  { href: "/pro/mentees", title: "My mentees", text: "Students you mentor.", icon: Users },
  { href: "/messages", title: "Messages", text: "Talk with your mentees.", icon: MessageSquare },
];

export default async function ProfessionalHome() {
  const me = await requireAccessLevel("professional");
  const [d, mine] = await Promise.all([getProfessionalDashboard(me.id), getMyProfessionalStatus(me.id)]);

  return (
    <>
      <PageHeader title={`Welcome, ${me.name.split(" ")[0]}`} description="Your mentoring at a glance." />

      {mine && mine.status !== "verified" && (
        <div role="status" className="mb-6 flex gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
          <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="space-y-1">
            <p className="font-medium">{mine.status === "rejected" ? "Your application was not approved" : "Your application is being reviewed"}</p>
            <p>
              {mine.status === "rejected"
                ? `${mine.rejectionReason ?? "Please check your credentials."} Upload new credentials in your profile settings to apply again.`
                : mine.hasCredentials
                  ? "An administrator will verify your credentials soon. Students can find you once you are approved."
                  : "Upload your credentials in your profile settings so an administrator can verify you."}
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Pending requests" value={d.pendingRequests} icon={Inbox} href="/pro/requests" highlight={d.pendingRequests > 0} />
        <StatCard label="Upcoming sessions" value={d.upcomingSessions} icon={CalendarClock} href="/pro/sessions" />
        <StatCard label="Unread messages" value={d.unreadMessages} icon={MessageSquare} href="/messages" highlight={d.unreadMessages > 0} />
        <StatCard label="Open slots" value={d.openSlots} icon={CalendarPlus} href="/pro/availability" />
      </div>

      {d.nextSession && (
        <section className="mt-8" aria-labelledby="next">
          <h2 id="next" className="mb-3 text-lg font-semibold">
            Your next session
          </h2>
          <SessionCard session={d.nextSession} viewer="professional" />
        </section>
      )}

      <section className="mt-8" aria-labelledby="shortcuts">
        <h2 id="shortcuts" className="mb-3 text-lg font-semibold">
          Shortcuts
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {SHORTCUTS.map(({ href, title, text, icon: Icon }) => (
            <Link key={href} href={href} className="rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <Card className="h-full transition-colors hover:border-primary">
                <CardContent className="flex items-start gap-3 p-4">
                  <Icon className="mt-0.5 h-5 w-5 text-primary" aria-hidden />
                  <div>
                    <p className="font-medium">{title}</p>
                    <p className="text-sm text-muted-foreground">{text}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
