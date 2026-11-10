"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { subscribeToInbox } from "@/lib/data/realtime";
import { relativeTime } from "@/lib/format";
import type { Conversation } from "@/lib/data/messages";
import { cn } from "@/lib/utils";

/** The inbox: one row per conversation with preview, time and an unread badge. Refreshes live. */
export function ConversationList({ conversations, meId }: { conversations: Conversation[]; meId: string }) {
  const router = useRouter();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToInbox(meId, () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => router.refresh(), 400);
    });
    return () => {
      unsubscribe();
      if (timer.current) clearTimeout(timer.current);
    };
  }, [meId, router]);

  return (
    <ul className="divide-y rounded-lg border">
      {conversations.map((c) => {
        const unread = c.unreadCount > 0;
        return (
          <li key={c.requestId}>
            <Link href={`/messages/${c.requestId}`} className="flex items-center gap-3 p-4 hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <Avatar name={c.otherUserName} className="h-11 w-11" />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <p className={cn("truncate", unread ? "font-semibold" : "font-medium")}>
                    {c.otherUserName} {c.status === "cancelled" && <Badge className="ml-1">Cancelled</Badge>}
                  </p>
                  <time dateTime={c.lastActivity} className="shrink-0 text-xs text-muted-foreground">
                    {relativeTime(c.lastActivity)}
                  </time>
                </div>
                <p className={cn("truncate text-sm", unread ? "text-foreground" : "text-muted-foreground")}>
                  {c.lastMessage ? (c.lastSenderId === meId ? `You: ${c.lastMessage}` : c.lastMessage) : "No messages yet. Say hello."}
                </p>
              </div>
              {unread && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-semibold text-primary-foreground" aria-label={`${c.unreadCount} unread`}>
                  {c.unreadCount}
                </span>
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
