import "server-only";
import { createClient } from "@/lib/supabase/server";
import { rangeFor } from "@/lib/pagination";

export type Peer = { id: string; firstName: string; interestNames: string[]; interestIds: string[]; sharedCount: number; connection: "none" | "sent" | "received" | "connected" | "declined" };

/**
 * Students the signed-in student may connect with (view peer_directory: same age band, consent done,
 * first name and interests only). Most shared interests first. `career` filters by one interest.
 */
export async function listPeers(opts: { careerId?: string; page?: number; pageSize?: number }): Promise<{ peers: Peer[]; total: number }> {
  const supabase = await createClient();
  const { from, to } = rangeFor(opts.page ?? 1, opts.pageSize ?? 12);
  let query = supabase
    .from("peer_directory")
    .select("id, first_name, interest_ids, interest_names, shared_count", { count: "exact" })
    .order("shared_count", { ascending: false })
    .order("first_name")
    .order("id")
    .range(from, to);
  if (opts.careerId) query = query.contains("interest_ids", [opts.careerId]);
  const { data, error, count } = await query;
  if (error) throw new Error(`Could not load students: ${error.message}`);
  const rows = data ?? [];

  // how each of them relates to me already
  const state = new Map<string, Peer["connection"]>();
  if (rows.length > 0) {
    const { data: mine, error: mineError } = await supabase.from("my_peer_connections").select("other_id, status, direction").in("other_id", rows.map((r) => r.id as string));
    if (mineError) throw new Error(`Could not load your connections: ${mineError.message}`);
    for (const c of mine ?? []) {
      state.set(c.other_id as string, c.status === "connected" ? "connected" : c.status === "declined" ? "declined" : c.direction === "sent" ? "sent" : "received");
    }
  }
  return {
    total: count ?? 0,
    peers: rows.map((r) => ({
      id: r.id as string,
      firstName: r.first_name as string,
      interestIds: r.interest_ids ?? [],
      interestNames: r.interest_names ?? [],
      sharedCount: r.shared_count ?? 0,
      connection: state.get(r.id as string) ?? "none",
    })),
  };
}

export async function requestConnection(requesterId: string, recipientId: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("peer_connections").insert({ requester_id: requesterId, recipient_id: recipientId });
  if (error) {
    if (error.code === "23505") throw new Error("You already have a connection or a request with this student.");
    throw error;
  }
}

export type PeerConnection = { id: string; status: "pending" | "connected" | "declined"; direction: "sent" | "received"; otherId: string; otherFirstName: string; createdAt: string };

export type ConnectionTab = "sent" | "received" | "connected";

/** Tabs: Sent (pending, I asked), Received (pending, they asked), Connected. */
export async function listConnections(tab: ConnectionTab, opts: { page?: number; pageSize?: number } = {}): Promise<{ connections: PeerConnection[]; total: number }> {
  const supabase = await createClient();
  const { from, to } = rangeFor(opts.page ?? 1, opts.pageSize ?? 20);
  let query = supabase.from("my_peer_connections").select("id, status, direction, other_id, other_first_name, created_at", { count: "exact" }).order("created_at", { ascending: false }).range(from, to);
  if (tab === "connected") query = query.eq("status", "connected");
  else query = query.eq("status", "pending").eq("direction", tab);
  const { data, error, count } = await query;
  if (error) throw new Error(`Could not load connections: ${error.message}`);
  return {
    total: count ?? 0,
    connections: (data ?? []).map((c) => ({ id: c.id as string, status: c.status as PeerConnection["status"], direction: c.direction as PeerConnection["direction"], otherId: c.other_id as string, otherFirstName: c.other_first_name as string, createdAt: c.created_at as string })),
  };
}

export async function countConnections(): Promise<Record<ConnectionTab, number>> {
  const supabase = await createClient();
  const [sent, received, connected] = await Promise.all([
    supabase.from("my_peer_connections").select("id", { count: "exact", head: true }).eq("status", "pending").eq("direction", "sent"),
    supabase.from("my_peer_connections").select("id", { count: "exact", head: true }).eq("status", "pending").eq("direction", "received"),
    supabase.from("my_peer_connections").select("id", { count: "exact", head: true }).eq("status", "connected"),
  ]);
  return { sent: sent.count ?? 0, received: received.count ?? 0, connected: connected.count ?? 0 };
}

export async function answerConnection(id: string, accept: boolean): Promise<void> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("peer_connections").update({ status: accept ? "connected" : "declined" }).eq("id", id).select("id");
  if (error) throw error;
  if (!data || data.length === 0) throw new Error("This request was already answered or no longer exists.");
}
