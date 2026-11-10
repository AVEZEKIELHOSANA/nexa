import type { Metadata } from "next";
import Link from "next/link";
import { CancelSessionButton } from "@/components/cancel-session-button";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Pagination } from "@/components/pagination";
import { SessionCard } from "@/components/session-card";
import { buttonVariants } from "@/components/ui/button";
import { listUpcomingSessions } from "@/lib/data/sessions";
import { PAGE_SIZE, parsePage, type SearchParams } from "@/lib/pagination";

export const metadata: Metadata = { title: "My sessions" };

export default async function StudentSessionsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const page = parsePage(await searchParams);
  const { sessions, total } = await listUpcomingSessions({ page, pageSize: PAGE_SIZE });

  return (
    <>
      <PageHeader title="My upcoming sessions" description="Accepted sessions that have not finished yet, soonest first." />
      {sessions.length === 0 ? (
        <EmptyState
          title="No upcoming sessions"
          description="When a professional accepts your request, the session appears here."
          action={
            <Link href="/careers" className={buttonVariants({ size: "sm" })}>
              Find a mentor
            </Link>
          }
        />
      ) : (
        <div className="space-y-4">
          <ul className="space-y-3">
            {sessions.map((s) => (
              <li key={s.requestId}>
                <SessionCard session={s} viewer="student" actions={new Date(s.startTime) > new Date() ? <CancelSessionButton requestId={s.requestId} otherName={s.professionalName} /> : undefined} />
              </li>
            ))}
          </ul>
          <Pagination page={page} total={total} pageSize={PAGE_SIZE} />
        </div>
      )}
    </>
  );
}
