import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarClock } from "lucide-react";
import { MessageThread } from "@/components/message-thread";
import { ReportConcernButton } from "@/components/report-concern-dialog";
import { Avatar } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/ui/badge";
import { requireAnyAccessLevel } from "@/lib/auth-guards";
import { listMessages } from "@/lib/data/messages";
import { getMyRequest } from "@/lib/data/requests";
import { formatDayHeading, formatTimeRange } from "@/lib/format";
import { isUuid } from "@/lib/pagination";

export const metadata: Metadata = { title: "Conversation" };

export default async function ConversationPage({ params }: { params: Promise<{ requestId: string }> }) {
  const { requestId } = await params;
  if (!isUuid(requestId)) notFound();
  const me = await requireAnyAccessLevel("student", "professional");
  const perspective = me.accessLevel === "student" ? "student" : "professional";

  const request = await getMyRequest(requestId, perspective);
  // A conversation exists only for requests that were accepted (and maybe cancelled later).
  const hasConversation = request && (request.status === "accepted" || (request.status === "cancelled" && request.decidedAt !== null));
  if (!request || !hasConversation) notFound();

  const { messages, hasMore } = await listMessages(requestId);
  const backHref = "/messages";

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Link href={backHref} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> All messages
      </Link>

      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Avatar name={request.otherName} className="h-11 w-11" />
          <div>
            <h1 className="text-lg font-semibold leading-tight">{request.otherName}</h1>
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <CalendarClock className="h-3.5 w-3.5" />
              {formatDayHeading(request.slot.startTime)}, {formatTimeRange(request.slot.startTime, request.slot.endTime)}
              <StatusBadge status={request.status} />
            </p>
          </div>
        </div>
        <ReportConcernButton targetType={perspective === "student" ? "professional" : "student"} targetId={request.otherId} targetLabel={request.otherName} />
      </header>

      <MessageThread requestId={requestId} meId={me.id} otherName={request.otherName} initialMessages={messages} initialHasMore={hasMore} readOnly={request.status !== "accepted"} />
    </div>
  );
}
