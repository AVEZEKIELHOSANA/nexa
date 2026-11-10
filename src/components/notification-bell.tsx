"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { toast } from "sonner";
import { buttonVariants } from "@/components/ui/button";
import type { AccessLevel } from "@/lib/auth";
import { subscribeToNotifications } from "@/lib/data/realtime";
import { describeNotification } from "@/lib/notifications";

/**
 * The navbar bell. The server renders it with the current unread count; while the page is open a
 * Realtime subscription adds new notifications live (badge + a toast with a link). When the server
 * sends a new count (after marking notifications read), the badge follows it.
 */
export function NotificationBell({ userId, level, initialUnread }: { userId: string; level: AccessLevel; initialUnread: number }) {
  const router = useRouter();
  const [unread, setUnread] = useState(initialUnread);
  const seen = useRef(new Set<string>());

  useEffect(() => setUnread(initialUnread), [initialUnread]);

  useEffect(() => {
    return subscribeToNotifications(userId, (n) => {
      if (seen.current.has(n.id)) return;
      seen.current.add(n.id);
      setUnread((c) => c + 1);
      const view = describeNotification(n, level);
      toast(view.title, {
        description: view.detail,
        action: view.href ? { label: "View", onClick: () => router.push(view.href!) } : undefined,
      });
      router.refresh(); // lists on the current page (requests, notifications) catch up
    });
  }, [userId, level, router]);

  return (
    <Link href="/notifications" aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"} className={buttonVariants({ variant: "ghost", size: "icon" }) + " relative"}>
      <Bell className="h-5 w-5" />
      {unread > 0 && (
        <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold leading-none text-destructive-foreground">
          {unread > 99 ? "99+" : unread}
        </span>
      )}
    </Link>
  );
}
