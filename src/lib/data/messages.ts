import "server-only";
import { createClient } from "@/lib/supabase/server";
import { PAGE_SIZE, rangeFor } from "@/lib/pagination";
import type { Message } from "@/lib/messages";

const COLUMNS = "id, mentorship_request_id, sender_id, body, read_at, created_at";

type Row = { id: string; mentorship_request_id: string; sender_id: string; body: string; read_at: string | null; created_at: string };

const map = (r: Row): Message => ({ id: r.id, requestId: r.mentorship_request_id, senderId: r.sender_id, body: r.body, readAt: r.read_at, createdAt: r.created_at });

export const THREAD_PAGE = 50;

/**
 * Newest `limit` messages (optionally only those before a cursor), returned oldest first so they can
 * be drawn top to bottom. Row Level Security decides what the caller may read: only the matched
 * student and professional, and never removed messages.
 */
export async function listMessages(requestId: string, opts: { before?: string; limit?: number } = {}): Promise<{ messages: Message[]; hasMore: boolean }> {
  const supabase = await createClient();
  const limit = opts.limit ?? THREAD_PAGE;
  let query = supabase.from("messages").select(COLUMNS).eq("mentorship_request_id", requestId).order("created_at", { ascending: false }).limit(limit + 1);
  if (opts.before) query = query.lt("created_at", opts.before);
  const { data, error } = await query;
  if (error) throw new Error(`Could not load messages: ${error.message}`);
  const rows = data ?? [];
  return { hasMore: rows.length > limit, messages: rows.slice(0, limit).reverse().map(map) };
}

export async function sendMessage(requestId: string, senderId: string, body: string): Promise<Message> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("messages").insert({ mentorship_request_id: requestId, sender_id: senderId, body }).select(COLUMNS).single();
  if (error) throw error;
  return map(data);
}

/** Marks everything the other person sent in this conversation as read. */
export async function markConversationRead(requestId: string, myId: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("messages")
    .update({ read_at: new Date().toISOString() })
    .eq("mentorship_request_id", requestId)
    .neq("sender_id", myId)
    .is("read_at", null);
  if (error) throw error;
}

export type Conversation = {
  requestId: string;
  status: "accepted" | "cancelled";
  otherUserId: string;
  otherUserName: string;
  lastMessage: string | null;
  lastMessageAt: string | null;
  lastSenderId: string | null;
  unreadCount: number;
  lastActivity: string;
};

/** The signed-in person's conversations, most recent activity first (view my_conversations). */
export async function listConversations(opts: { page?: number; pageSize?: number } = {}): Promise<{ conversations: Conversation[]; total: number }> {
  const supabase = await createClient();
  const { from, to } = rangeFor(opts.page ?? 1, opts.pageSize ?? PAGE_SIZE);
  const { data, error, count } = await supabase
    .from("my_conversations")
    .select("request_id, status, other_user_id, other_user_name, last_message, last_message_at, last_sender_id, unread_count, last_activity", { count: "exact" })
    .order("last_activity", { ascending: false })
    .range(from, to);
  if (error) throw new Error(`Could not load conversations: ${error.message}`);
  return {
    total: count ?? 0,
    conversations: (data ?? []).map((c) => ({
      requestId: c.request_id as string,
      status: c.status as Conversation["status"],
      otherUserId: c.other_user_id as string,
      otherUserName: c.other_user_name as string,
      lastMessage: c.last_message,
      lastMessageAt: c.last_message_at,
      lastSenderId: c.last_sender_id,
      unreadCount: c.unread_count ?? 0,
      lastActivity: c.last_activity as string,
    })),
  };
}

/** Total unread messages for the navbar badge and dashboards. Never throws. */
export async function getUnreadMessageCount(): Promise<number> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.from("my_conversations").select("unread_count");
    if (error || !data) return 0;
    return data.reduce((sum, row) => sum + (row.unread_count ?? 0), 0);
  } catch {
    return 0;
  }
}
