import Link from "next/link";
import { CalendarClock } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { RequestItem } from "@/lib/data/requests";
import { formatDayHeading, formatTimeRange, relativeTime } from "@/lib/format";

/**
 * RequestRow: one mentorship request in a list. The name is the other person (the professional in a
 * student's list, the student in a professional's). `href` makes the row a link to the detail page;
 * `actions` is where a screen puts its buttons (Accept / Decline on the professional's list).
 */
export function RequestRow({ request: r, href, actions, showMessage = false }: { request: RequestItem; href?: string; actions?: React.ReactNode; showMessage?: boolean }) {
  const reason = r.status === "declined" ? r.declineReason : r.status === "cancelled" ? r.cancelReason : null;
  return (
    <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <Avatar name={r.otherName} />
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            {href ? (
              <Link href={href} className="font-medium hover:underline">
                {r.otherName}
              </Link>
            ) : (
              <span className="font-medium">{r.otherName}</span>
            )}
            <StatusBadge status={r.status} />
          </div>
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <CalendarClock className="h-3.5 w-3.5" />
            {formatDayHeading(r.slot.startTime)}, {formatTimeRange(r.slot.startTime, r.slot.endTime)}
          </p>
          {showMessage && r.message && <p className="line-clamp-3 whitespace-pre-line text-sm">“{r.message}”</p>}
          {reason && <p className="text-xs text-muted-foreground">Reason: {reason}</p>}
          <p className="text-xs text-muted-foreground">Requested {relativeTime(r.createdAt)}</p>
        </div>
      </div>
      {actions && <div className="flex flex-wrap gap-2 sm:justify-end">{actions}</div>}
    </Card>
  );
}
