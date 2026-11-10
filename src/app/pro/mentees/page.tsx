import type { Metadata } from "next";
import Link from "next/link";
import { CalendarClock, MessageSquare } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Pagination } from "@/components/pagination";
import { Avatar } from "@/components/ui/avatar";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { requireAccessLevel } from "@/lib/auth";
import { listMentees } from "@/lib/data/mentees";
import { formatDateTime } from "@/lib/format";
import { PAGE_SIZE, parsePage, type SearchParams } from "@/lib/pagination";

export const metadata: Metadata = { title: "My mentees" };

export default async function MenteesPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const page = parsePage(await searchParams);
  const me = await requireAccessLevel("professional");
  const { mentees, total } = await listMentees(me.id, { page, pageSize: PAGE_SIZE });

  return (
    <>
      <PageHeader title="My mentees" description="Students whose requests you accepted." />
      {mentees.length === 0 ? (
        <EmptyState title="No mentees yet" description="When you accept a student's request, they appear here with a link to your conversation." />
      ) : (
        <div className="space-y-4">
          <ul className="space-y-3">
            {mentees.map((m) => (
              <li key={m.studentId}>
                <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar name={m.name} className="h-11 w-11" />
                    <div className="space-y-0.5">
                      <p className="font-medium">{m.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {m.sessions} session{m.sessions === 1 ? "" : "s"} booked
                      </p>
                      <p className="flex items-center gap-1.5 text-sm">
                        <CalendarClock className="h-3.5 w-3.5 text-muted-foreground" />
                        {m.nextSession ? <>Next: {formatDateTime(m.nextSession)}</> : m.lastSession ? <>Last: {formatDateTime(m.lastSession)}</> : "No session time"}
                      </p>
                    </div>
                  </div>
                  <Link href={`/messages/${m.conversationRequestId}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
                    <MessageSquare className="h-4 w-4" /> Conversation
                  </Link>
                </Card>
              </li>
            ))}
          </ul>
          <Pagination page={page} total={total} pageSize={PAGE_SIZE} />
        </div>
      )}
    </>
  );
}
