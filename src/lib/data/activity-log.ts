import "server-only";
import { createClient } from "@/lib/supabase/server";
import { rangeFor } from "@/lib/pagination";

export type ActivityEntry = {
  id: string;
  action: string;
  targetType: string | null;
  targetId: string | null;
  details: Record<string, unknown>;
  adminName: string | null;
  createdAt: string;
};

type Row = { id: string; action: string; target_type: string | null; target_id: string | null; details: Record<string, unknown>; created_at: string; admin: { name: string } | null };

/** Newest first. `group` is the part before the dot ("user", "career", ...). The table is insert-only. */
export async function listActivity(opts: { group?: string; adminId?: string; from?: string; to?: string; page?: number; pageSize?: number }): Promise<{ entries: ActivityEntry[]; total: number }> {
  const supabase = await createClient();
  const { from, to } = rangeFor(opts.page ?? 1, opts.pageSize ?? 30);
  let query = supabase
    .from("admin_activity_log")
    .select("id, action, target_type, target_id, details, created_at, admin:profiles!admin_id(name)", { count: "exact" })
    .order("created_at", { ascending: false })
    .order("id")
    .range(from, to);
  if (opts.group) query = query.like("action", `${opts.group.replace(/[%_\\]/g, "")}.%`);
  if (opts.adminId) query = query.eq("admin_id", opts.adminId);
  if (opts.from) query = query.gte("created_at", opts.from);
  if (opts.to) query = query.lt("created_at", opts.to);
  const { data, error, count } = await query.overrideTypes<Row[], { merge: false }>();
  if (error) throw new Error(`Could not load the activity log: ${error.message}`);
  return {
    total: count ?? 0,
    entries: (data ?? []).map((r) => ({ id: r.id, action: r.action, targetType: r.target_type, targetId: r.target_id, details: r.details ?? {}, adminName: r.admin?.name ?? null, createdAt: r.created_at })),
  };
}
