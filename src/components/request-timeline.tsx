import { cn } from "@/lib/utils";
import type { RequestItem } from "@/lib/data/requests";
import { formatDateTime } from "@/lib/format";

type Event = { label: string; at: string; note?: string | null; tone?: "good" | "bad" | "neutral" };

/** What happened to a request, oldest first, rebuilt from its timestamps. */
export function requestEvents(r: RequestItem): Event[] {
  const events: Event[] = [{ label: "Request sent", at: r.createdAt, note: r.message }];
  if (r.decidedAt) {
    if (r.status === "declined") events.push({ label: "Declined", at: r.decidedAt, note: r.declineReason, tone: "bad" });
    else events.push({ label: "Accepted", at: r.decidedAt, tone: "good" });
  }
  if (r.cancelledAt) events.push({ label: "Cancelled", at: r.cancelledAt, note: r.cancelReason, tone: "bad" });
  return events;
}

/** RequestTimeline: the "status history" of the request detail page. */
export function RequestTimeline({ request }: { request: RequestItem }) {
  const events = requestEvents(request);
  return (
    <ol className="space-y-4 border-l pl-5">
      {events.map((e, i) => (
        <li key={i} className="relative">
          <span
            aria-hidden
            className={cn(
              "absolute -left-[1.6rem] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-background",
              e.tone === "good" ? "bg-emerald-500" : e.tone === "bad" ? "bg-red-500" : "bg-muted-foreground"
            )}
          />
          <p className="text-sm font-medium">{e.label}</p>
          <p className="text-xs text-muted-foreground">{formatDateTime(e.at)}</p>
          {e.note && <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">“{e.note}”</p>}
        </li>
      ))}
    </ol>
  );
}
