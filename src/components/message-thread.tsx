"use client";

import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MessageBubble } from "@/components/message-bubble";
import { MessageComposer } from "@/components/message-composer";
import { loadEarlierMessagesAction, loadLatestMessagesAction, markConversationReadAction, sendMessageAction } from "@/lib/actions/messages";
import { subscribeToConversation } from "@/lib/data/realtime";
import { dayKey, formatDayHeading } from "@/lib/format";
import type { Message } from "@/lib/messages";

/** Add or update messages by id (so a message that arrives twice, by send + live update, shows once). */
function merge(list: Message[], incoming: Message[]): Message[] {
  const byId = new Map(list.map((m) => [m.id, m]));
  for (const m of incoming) {
    const old = byId.get(m.id);
    byId.set(m.id, old ? { ...old, ...m, readAt: m.readAt ?? old.readAt } : m);
  }
  return [...byId.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

/**
 * The conversation: bubbles, live updates, composer. Shared by students and professionals.
 *  - new messages arrive through Realtime; if the connection drops, the thread reloads the latest
 *    messages when the tab is focused again;
 *  - what the other person sent is marked read while the thread is open and visible;
 *  - `readOnly` (a cancelled session) hides the composer.
 */
export function MessageThread({ requestId, meId, otherName, initialMessages, initialHasMore, readOnly }: { requestId: string; meId: string; otherName: string; initialMessages: Message[]; initialHasMore: boolean; readOnly: boolean }) {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [connected, setConnected] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);
  const readTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const markRead = useCallback(() => {
    if (document.visibilityState !== "visible") return;
    if (readTimer.current) clearTimeout(readTimer.current);
    readTimer.current = setTimeout(async () => {
      await markConversationReadAction(requestId);
      router.refresh(); // navbar counter
    }, 500);
  }, [requestId, router]);

  // follow props (after router.refresh) without losing anything already shown
  useEffect(() => setMessages((cur) => merge(cur, initialMessages)), [initialMessages]);

  // live updates
  useEffect(() => {
    const unsubscribe = subscribeToConversation(requestId, {
      onMessage: (m) => {
        setMessages((cur) => merge(cur, [m]));
        if (m.senderId !== meId && !m.readAt) markRead();
      },
      onRemoved: (id) => setMessages((cur) => cur.filter((m) => m.id !== id)),
      onStatus: setConnected,
    });
    return unsubscribe;
  }, [requestId, meId, markRead]);

  // catch up when the tab comes back, and mark read
  useEffect(() => {
    async function refetch() {
      if (document.visibilityState !== "visible") return;
      const r = await loadLatestMessagesAction(requestId);
      if (r.ok) setMessages((cur) => merge(cur, r.data.messages));
      markRead();
    }
    document.addEventListener("visibilitychange", refetch);
    window.addEventListener("focus", refetch);
    markRead();
    return () => {
      document.removeEventListener("visibilitychange", refetch);
      window.removeEventListener("focus", refetch);
      if (readTimer.current) clearTimeout(readTimer.current);
    };
  }, [requestId, markRead]);

  // keep the newest message in view, unless the reader scrolled up
  useEffect(() => {
    const el = scroller.current;
    if (el && stickToBottom.current) el.scrollTop = el.scrollHeight;
  }, [messages]);

  async function send(body: string): Promise<string | null> {
    const r = await sendMessageAction(requestId, body);
    if (!r.ok) return r.error;
    stickToBottom.current = true;
    setMessages((cur) => merge(cur, [r.data.message]));
    return null;
  }

  async function loadEarlier() {
    if (messages.length === 0) return;
    setLoadingMore(true);
    const el = scroller.current;
    const before = el?.scrollHeight ?? 0;
    const r = await loadEarlierMessagesAction(requestId, messages[0].createdAt);
    setLoadingMore(false);
    if (!r.ok) return;
    stickToBottom.current = false;
    setMessages((cur) => merge(cur, r.data.messages));
    setHasMore(r.data.hasMore);
    requestAnimationFrame(() => {
      if (el) el.scrollTop = el.scrollHeight - before; // keep the reader where they were
    });
  }

  const lastMine = [...messages].reverse().find((m) => m.senderId === meId)?.id;

  return (
    <div className="flex h-[min(70vh,40rem)] flex-col overflow-hidden rounded-lg border">
      {!connected && (
        <p role="status" className="flex items-center justify-center gap-1.5 bg-amber-100 px-3 py-1 text-xs text-amber-900 dark:bg-amber-950 dark:text-amber-200">
          <WifiOff className="h-3.5 w-3.5" /> Live updates paused. Reconnecting…
        </p>
      )}
      <div
        ref={scroller}
        onScroll={(e) => {
          const el = e.currentTarget;
          stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
        }}
        className="flex-1 space-y-3 overflow-y-auto p-4"
        aria-live="polite"
        aria-label={`Conversation with ${otherName}`}
      >
        {hasMore && (
          <div className="text-center">
            <Button variant="ghost" size="sm" onClick={loadEarlier} disabled={loadingMore}>
              {loadingMore ? "Loading…" : "Load earlier messages"}
            </Button>
          </div>
        )}
        {messages.length === 0 && <p className="py-10 text-center text-sm text-muted-foreground">No messages yet. Say hello to {otherName}.</p>}
        {messages.map((m, i) => {
          const newDay = i === 0 || dayKey(messages[i - 1].createdAt) !== dayKey(m.createdAt);
          return (
            <Fragment key={m.id}>
              {newDay && <p className="pt-2 text-center text-xs font-medium text-muted-foreground">{formatDayHeading(m.createdAt)}</p>}
              <MessageBubble message={m} mine={m.senderId === meId} senderName={otherName} showStatus={m.id === lastMine} />
            </Fragment>
          );
        })}
      </div>
      {readOnly ? (
        <p className="border-t bg-muted/50 p-3 text-center text-sm text-muted-foreground">This session was cancelled, so the conversation is read-only.</p>
      ) : (
        <MessageComposer onSend={send} />
      )}
    </div>
  );
}
