import Link from "next/link";
import { CalendarClock, ExternalLink, MessageSquare } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { UpcomingSession } from "@/lib/data/sessions";
import { formatDayHeading, formatTimeRange } from "@/lib/format";

/**
 * SessionCard: one upcoming session. `viewer` says whose list this is, so the card shows the other
 * person. `actions` is for extra buttons (Cancel session).
 */
export function SessionCard({ session: s, viewer, actions }: { session: UpcomingSession; viewer: "student" | "professional"; actions?: React.ReactNode }) {
  const otherName = viewer === "student" ? s.professionalName : s.studentName;
  return (
    <Card className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        <Avatar name={otherName} className="h-11 w-11" />
        <div className="min-w-0 space-y-1">
          <p className="font-medium">{otherName}</p>
          <p className="flex items-center gap-1.5 text-sm">
            <CalendarClock className="h-3.5 w-3.5 text-muted-foreground" />
            {formatDayHeading(s.startTime)}, {formatTimeRange(s.startTime, s.endTime)}
          </p>
          {s.meetingUrl ? (
            <a href={s.meetingUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
              <ExternalLink className="h-3.5 w-3.5" /> Join meeting
            </a>
          ) : (
            <p className="text-xs text-muted-foreground">No meeting link yet. Agree on one in the conversation.</p>
          )}
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Link href={`/messages/${s.requestId}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
          <MessageSquare className="h-4 w-4" /> Message
        </Link>
        {actions}
      </div>
    </Card>
  );
}
