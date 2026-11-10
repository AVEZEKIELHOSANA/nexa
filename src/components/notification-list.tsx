"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { CalendarCheck, CalendarX, CheckCheck, Info, MessageSquare, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { Pagination } from "@/components/pagination";
import type { AccessLevel } from "@/lib/auth";
import { relativeTime } from "@/lib/format";
import { describeNotification, type AppNotification } from "@/lib/notifications";
import { cn } from "@/lib/utils";
import { markAllReadAction, markNotificationReadAction } from "@/app/notifications/actions";

const ICON: Record<string, typeof Info> = {
  new_request: CalendarCheck,
  request_accepted: CalendarCheck,
  request_declined: CalendarX,
  session_cancelled: CalendarX,
  verification_result: ShieldCheck,
  new_message: MessageSquare,
  report_resolved: ShieldCheck,
};

/**
 * The notification list, shared by the student and the professional (the one component the spec
 * asks for). Clicking a notification marks it read and opens what it is about.
 */
export function NotificationList({ notifications, level, total, page, pageSize, unreadOnly }: { notifications: AppNotification[]; level: AccessLevel; total: number; page: number; pageSize: number; unreadOnly: boolean }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const hasUnread = notifications.some((n) => !n.readAt && !readIds.has(n.id));

  function open(n: AppNotification) {
    if (n.readAt || readIds.has(n.id)) return;
    setReadIds((s) => new Set(s).add(n.id));
    void markNotificationReadAction(n.id);
  }

  function markAll() {
    startTransition(async () => {
      const r = await markAllReadAction();
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      setReadIds(new Set(notifications.map((n) => n.id)));
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={markAll} disabled={!hasUnread}>
          <CheckCheck className="h-4 w-4" /> Mark all as read
        </Button>
      </div>

      {notifications.length === 0 ? (
        <EmptyState title={unreadOnly ? "No unread notifications" : "No notifications yet"} description="Updates about your requests, sessions and messages will appear here." />
      ) : (
        <ul className="divide-y rounded-lg border">
          {notifications.map((n) => {
            const view = describeNotification(n, level);
            const unread = !n.readAt && !readIds.has(n.id);
            const Icon = ICON[n.type] ?? Info;
            const content = (
              <div className={cn("flex items-start gap-3 p-4", unread && "bg-primary/5")}>
                <Icon className={cn("mt-0.5 h-5 w-5 shrink-0", view.tone === "good" ? "text-emerald-600" : view.tone === "bad" ? "text-red-600" : "text-sky-600")} aria-hidden />
                <div className="min-w-0 flex-1 space-y-0.5">
                  <p className={cn("text-sm", unread && "font-semibold")}>{view.title}</p>
                  {view.detail && <p className="line-clamp-2 text-sm text-muted-foreground">{view.detail}</p>}
                  <p className="text-xs text-muted-foreground">{relativeTime(n.createdAt)}</p>
                </div>
                {unread && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" aria-label="Unread" />}
              </div>
            );
            return (
              <li key={n.id}>
                {view.href ? (
                  <Link href={view.href} onClick={() => open(n)} className="block hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    {content}
                  </Link>
                ) : (
                  <button type="button" onClick={() => open(n)} className="block w-full text-left hover:bg-accent/50">
                    {content}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
      <Pagination page={page} total={total} pageSize={pageSize} />
    </div>
  );
}
