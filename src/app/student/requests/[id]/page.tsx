import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarClock, ExternalLink, MessageSquare } from "lucide-react";
import { CancelSessionButton } from "@/components/cancel-session-button";
import { RequestTimeline } from "@/components/request-timeline";
import { Avatar } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAccessLevel } from "@/lib/auth";
import { getMyRequest } from "@/lib/data/requests";
import { formatDayHeading, formatTimeRange } from "@/lib/format";
import { isUuid } from "@/lib/pagination";

export const metadata: Metadata = { title: "Request" };

export default async function StudentRequestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  await requireAccessLevel("student");

  const r = await getMyRequest(id, "student");
  if (!r) notFound();

  const future = new Date(r.slot.startTime) > new Date();
  const canCancel = (r.status === "pending" || r.status === "accepted") && future;
  // Messages exist only for requests that were accepted at some point (then possibly cancelled: read-only).
  const hasConversation = r.status === "accepted" || (r.status === "cancelled" && r.decidedAt !== null);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link href="/student/requests" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> My requests
      </Link>

      <Card>
        <CardHeader className="flex-row items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <Avatar name={r.otherName} className="h-11 w-11" />
            <div>
              <CardTitle className="text-lg">{r.otherName}</CardTitle>
              <Link href={`/professionals/${r.otherId}`} className="text-sm text-primary hover:underline">
                View profile
              </Link>
            </div>
          </div>
          <StatusBadge status={r.status} />
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="flex items-center gap-2 text-sm">
            <CalendarClock className="h-4 w-4 text-muted-foreground" />
            {formatDayHeading(r.slot.startTime)}, {formatTimeRange(r.slot.startTime, r.slot.endTime)}
          </p>

          {r.status === "accepted" &&
            (r.meetingUrl ? (
              <a href={r.meetingUrl} target="_blank" rel="noopener noreferrer" className={buttonVariants({ size: "sm" })}>
                <ExternalLink className="h-4 w-4" /> Join meeting
              </a>
            ) : (
              <p className="rounded-md bg-muted p-3 text-sm text-muted-foreground">No meeting link has been added yet. Ask {r.otherName} in the conversation.</p>
            ))}
          {r.status === "pending" && <p className="rounded-md bg-muted p-3 text-sm text-muted-foreground">Waiting for {r.otherName} to answer. You will be notified.</p>}

          <div className="flex flex-wrap gap-2">
            {hasConversation && (
              <Link href={`/messages/${r.id}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
                <MessageSquare className="h-4 w-4" /> {r.status === "accepted" ? "Open conversation" : "View conversation"}
              </Link>
            )}
            {canCancel && <CancelSessionButton requestId={r.id} kind={r.status === "pending" ? "withdraw" : "cancel"} otherName={r.otherName} />}
          </div>
          {r.status === "accepted" && !future && <p className="text-xs text-muted-foreground">This session has started, so it can no longer be cancelled.</p>}
        </CardContent>
      </Card>

      <section aria-labelledby="history">
        <h2 id="history" className="mb-3 text-lg font-semibold">
          History
        </h2>
        <RequestTimeline request={r} />
      </section>
    </div>
  );
}
