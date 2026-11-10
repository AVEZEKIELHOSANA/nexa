import { createClient } from "@/lib/supabase/client";
import type { Message } from "@/lib/messages";
import type { AppNotification } from "@/lib/notifications";

/**
 * Browser-side live updates. Components never talk to supabase-js themselves: they call these
 * functions, which return an `unsubscribe` function to call when the component unmounts.
 * Realtime respects Row Level Security, so each person only receives rows they may read.
 */

export function subscribeToNotifications(userId: string, onInsert: (n: AppNotification) => void): () => void {
  const supabase = createClient();
  const channel = supabase
    .channel(`notifications:${userId}`)
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` }, (change) => {
      const row = change.new as { id: string; type: string; payload: Record<string, unknown> | null; read_at: string | null; created_at: string };
      onInsert({ id: row.id, type: row.type, payload: row.payload ?? {}, readAt: row.read_at, createdAt: row.created_at });
    })
    .subscribe();
  return () => {
    void supabase.removeChannel(channel);
  };
}

type MessageRow = { id: string; mentorship_request_id: string; sender_id: string; body: string; read_at: string | null; created_at: string; deleted_at: string | null };

const toMessage = (r: MessageRow): Message => ({ id: r.id, requestId: r.mentorship_request_id, senderId: r.sender_id, body: r.body, readAt: r.read_at, createdAt: r.created_at });

/** Live changes of one conversation: new messages, read receipts, and removals by an administrator. */
export function subscribeToConversation(
  requestId: string,
  handlers: { onMessage: (m: Message) => void; onRemoved: (id: string) => void; onStatus?: (connected: boolean) => void }
): () => void {
  const supabase = createClient();
  const filter = `mentorship_request_id=eq.${requestId}`;
  const channel = supabase
    .channel(`conversation:${requestId}`)
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter }, (change) => {
      handlers.onMessage(toMessage(change.new as MessageRow));
    })
    .on("postgres_changes", { event: "UPDATE", schema: "public", table: "messages", filter }, (change) => {
      const row = change.new as MessageRow;
      if (row.deleted_at) handlers.onRemoved(row.id);
      else handlers.onMessage(toMessage(row)); // carries the new read_at
    })
    .subscribe((status) => handlers.onStatus?.(status === "SUBSCRIBED"));
  return () => {
    void supabase.removeChannel(channel);
  };
}

/** Any new message in any of my conversations (the inbox refreshes its list). */
export function subscribeToInbox(userId: string, onChange: () => void): () => void {
  const supabase = createClient();
  const channel = supabase
    .channel(`inbox:${userId}`)
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, () => onChange())
    .subscribe();
  return () => {
    void supabase.removeChannel(channel);
  };
}
