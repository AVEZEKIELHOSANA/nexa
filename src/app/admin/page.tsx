import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, CalendarClock, CircleCheck, Flag, GraduationCap, Handshake, Inbox, MessageSquare, ShieldCheck, UserCheck, Users } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { SignupsChart } from "@/components/signups-chart";
import { StatCard } from "@/components/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { describeActivity } from "@/lib/activity";
import { requireAccessLevel } from "@/lib/auth";
import { getAdminStats, getSignupsByDay } from "@/lib/data/admin-dashboard";
import { listActivity } from "@/lib/data/activity-log";
import { formatDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "Dashboard" };

export default async function AdminHome() {
  const me = await requireAccessLevel("admin");
  const [s, days, recent] = await Promise.all([getAdminStats(), getSignupsByDay(14), listActivity({ page: 1, pageSize: 8 })]);
  const attention = s.pendingVerifications + s.openReports + s.awaitingConsent;

  return (
    <>
      <PageHeader title={`Welcome, ${me.name.split(" ")[0]}`} description={attention === 0 ? "Nothing is waiting for you." : `${attention} thing${attention === 1 ? "" : "s"} need${attention === 1 ? "s" : ""} your attention.`} />

      <section aria-labelledby="attention" className="space-y-3">
        <h2 id="attention" className="text-lg font-semibold">Needs attention</h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Professionals to verify" value={s.pendingVerifications} icon={ShieldCheck} href="/admin/verification" highlight={s.pendingVerifications > 0} />
          <StatCard label="Open reports" value={s.openReports} icon={Flag} href="/admin/reports" highlight={s.openReports > 0} />
          <StatCard label="Awaiting guardian consent" value={s.awaitingConsent} icon={UserCheck} href="/admin/students?status=awaiting_consent" />
          <StatCard label="Pending requests" value={s.pendingRequests} icon={Inbox} href="/admin/requests" />
        </div>
      </section>

      <section aria-labelledby="platform" className="mt-8 space-y-3">
        <h2 id="platform" className="text-lg font-semibold">Platform</h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Active students" value={s.students} icon={GraduationCap} href="/admin/students" hint={`${s.newUsers7d} new accounts this week`} />
          <StatCard label="Active professionals" value={s.professionals} icon={Users} href="/admin/professionals" />
          <StatCard label="Upcoming sessions" value={s.upcomingSessions} icon={CalendarClock} href="/admin/requests" hint={`${s.completedSessions} held so far`} />
          <StatCard label="Messages this week" value={s.messages7d} icon={MessageSquare} />
          <StatCard label="Published courses" value={s.publishedCourses} icon={BookOpen} href="/admin/courses" />
          <StatCard label="Courses completed" value={s.courseCompletions} icon={CircleCheck} />
          <StatCard label="Peer connections" value={s.peerConnections} icon={Handshake} />
          <StatCard label="Administrators" value={s.admins} icon={ShieldCheck} href="/admin/users" />
        </div>
      </section>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Sign-ups</CardTitle>
          </CardHeader>
          <CardContent>
            <SignupsChart days={days} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Recent admin activity</CardTitle>
            <Link href="/admin/activity-log" className="text-sm text-primary hover:underline">View all</Link>
          </CardHeader>
          <CardContent>
            {recent.entries.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing recorded yet.</p>
            ) : (
              <ul className="space-y-3">
                {recent.entries.map((e) => (
                  <li key={e.id} className="text-sm">
                    <p>{describeActivity(e.action, e.details)}</p>
                    <p className="text-xs text-muted-foreground">{e.adminName ?? "System"} · {formatDateTime(e.createdAt)}</p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
