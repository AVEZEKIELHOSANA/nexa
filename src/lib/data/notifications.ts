import "server-only";
import { createClient } from "@/lib/supabase/server";
import { PAGE_SIZE, rangeFor } from "@/lib/pagination";
import type { AppNotification } from "@/lib/notifications";

export async function listNotifications(opts: { unreadOnly?: boolean; page?: number; pageSize?: number } = {}): Promise<{ notifications: AppNotification[]; total: number }> {
  const supabase = await createClient();
  const { from, to } = rangeFor(opts.page ?? 1, opts.pageSize ?? PAGE_SIZE);
  let query = supabase
    .from("notifications")
    .select("id, type, payload, read_at, created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);
  if (opts.unreadOnly) query = query.is("read_at", null);
  const { data, error, count } = await query;
  if (error) throw new Error(`Could not load notifications: ${error.message}`);
  return {
    total: count ?? 0,
    notifications: (data ?? []).map((n) => ({
      id: n.id,
      type: n.type,
      payload: (n.payload ?? {}) as Record<string, unknown>,
      readAt: n.read_at,
      createdAt: n.created_at,
    })),
  };
}

/** Unread count for the navbar badge. Never throws: a failing badge must not break every page. */
export async function getUnreadNotificationCount(): Promise<number> {
  try {
    const supabase = await createClient();
    const { count, error } = await supabase.from("notifications").select("id", { count: "exact", head: true }).is("read_at", null);
    return error ? 0 : (count ?? 0);
  } catch {
    return 0;
  }
}

export async function markNotificationRead(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id).is("read_at", null);
  if (error) throw error;
}

export async function markAllNotificationsRead(): Promise<number> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("mark_all_notifications_read");
  if (error) throw error;
  return (data as number) ?? 0;
}
