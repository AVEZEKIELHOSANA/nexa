"use client";

import { useState } from "react";
import Link from "next/link";
import { CalendarPlus, ExternalLink, MessageSquare, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@/components/empty-state";
import { Pagination } from "@/components/pagination";
import { SlotForm } from "@/components/slot-form";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog, Modal } from "@/components/ui/modal";
import type { ActionResult } from "@/lib/action";
import type { ManagedSlot, SlotImpact } from "@/lib/data/availability";
import { formatDayHeading, formatTimeRange } from "@/lib/format";
import type { SlotFormValues } from "@/lib/slots";

export type SlotActions = {
  create: (values: SlotFormValues) => Promise<ActionResult>;
  update: (slotId: string, values: SlotFormValues, linkOnly: boolean) => Promise<ActionResult>;
  remove: (slotId: string) => Promise<ActionResult<{ result: "deleted" | "cancelled" }>>;
  /** admin only: which requests deleting the slot will decline or cancel */
  impact?: (slotId: string) => Promise<ActionResult<SlotImpact[]>>;
};

/**
 * Slot list with add / edit / delete, shared by "My Availability" (professional) and "Professional
 * Availability" (admin). `mode` only changes what is allowed: an admin may also edit the link of a
 * booked slot and delete a booked slot (after seeing which request it cancels).
 */
export function SlotManager({
  slots,
  total,
  page,
  pageSize,
  mode,
  canAdd,
  actions,
  emptyText,
}: {
  slots: ManagedSlot[];
  total: number;
  page: number;
  pageSize: number;
  mode: "professional" | "admin";
  canAdd: boolean;
  actions: SlotActions;
  emptyText: string;
}) {
  const [editing, setEditing] = useState<ManagedSlot | "new" | null>(null);
  const [deleting, setDeleting] = useState<ManagedSlot | null>(null);
  const [impact, setImpact] = useState<SlotImpact[] | null>(null);

  const canEdit = (s: ManagedSlot) => s.status === "open" || (mode === "admin" && s.status === "booked");
  const canDelete = (s: ManagedSlot) => s.status === "open" || (mode === "admin" && s.status === "booked");

  async function startDelete(slot: ManagedSlot) {
    setImpact(null);
    setDeleting(slot);
    if (mode === "admin" && actions.impact) {
      const r = await actions.impact(slot.id);
      if (r.ok) setImpact(r.data);
      else toast.error(r.error);
    }
  }

  const pending = impact?.filter((i) => i.status === "pending") ?? [];
  const accepted = impact?.filter((i) => i.status === "accepted") ?? [];

  return (
    <div className="space-y-4">
      {canAdd && (
        <div className="flex justify-end">
          <Button onClick={() => setEditing("new")}>
            <CalendarPlus className="h-4 w-4" /> Add slot
          </Button>
        </div>
      )}

      {slots.length === 0 ? (
        <EmptyState title="Nothing here" description={emptyText} />
      ) : (
        <ul className="space-y-3">
          {slots.map((s) => (
            <li key={s.id}>
              <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <p className="font-medium">{formatDayHeading(s.startTime)}</p>
                  <p className="text-sm text-muted-foreground">{formatTimeRange(s.startTime, s.endTime)}</p>
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <StatusBadge status={s.status} />
                    {s.status === "open" && s.pendingRequests > 0 && (
                      <Badge tone="warning">
                        {s.pendingRequests} pending request{s.pendingRequests === 1 ? "" : "s"}
                      </Badge>
                    )}
                    {s.booking && <span className="text-sm">Booked by {s.booking.studentName}</span>}
                    {s.meetingUrl && (
                      <a href={s.meetingUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
                        <ExternalLink className="h-3.5 w-3.5" /> Meeting link
                      </a>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {s.booking && mode === "professional" && (
                    <Link href={`/messages/${s.booking.requestId}`} className="inline-flex h-9 items-center gap-1.5 rounded-md border px-3 text-sm hover:bg-accent">
                      <MessageSquare className="h-4 w-4" /> Conversation
                    </Link>
                  )}
                  {canEdit(s) && (
                    <Button size="sm" variant="outline" onClick={() => setEditing(s)}>
                      <Pencil className="h-4 w-4" /> {s.status === "booked" ? "Edit link" : "Edit"}
                    </Button>
                  )}
                  {canDelete(s) && (
                    <Button size="sm" variant="outline" onClick={() => startDelete(s)} className="text-destructive">
                      <Trash2 className="h-4 w-4" /> Delete
                    </Button>
                  )}
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <Pagination page={page} total={total} pageSize={pageSize} />

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing === "new" ? "Add an availability slot" : "Edit slot"}>
        {editing && (
          <SlotForm
            key={editing === "new" ? "new" : editing.id}
            initial={editing === "new" ? undefined : { startTime: editing.startTime, endTime: editing.endTime, meetingUrl: editing.meetingUrl }}
            linkOnly={editing !== "new" && editing.status !== "open"}
            submitLabel={editing === "new" ? "Add slot" : "Save changes"}
            onSubmit={(values) => (editing === "new" ? actions.create(values) : actions.update(editing.id, values, editing.status !== "open"))}
            onDone={() => {
              toast.success(editing === "new" ? "Slot added" : "Slot updated");
              setEditing(null);
            }}
            onCancel={() => setEditing(null)}
          />
        )}
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        title="Delete this slot?"
        confirmLabel="Delete slot"
        destructive
        confirmDisabled={mode === "admin" && impact === null}
        description={
          <div className="space-y-2">
            {deleting && (
              <p>
                {formatDayHeading(deleting.startTime)}, {formatTimeRange(deleting.startTime, deleting.endTime)}
              </p>
            )}
            {mode === "professional" && deleting && deleting.pendingRequests > 0 && (
              <p>
                {deleting.pendingRequests} pending request{deleting.pendingRequests === 1 ? "" : "s"} will be declined and the student{deleting.pendingRequests === 1 ? "" : "s"} notified.
              </p>
            )}
            {mode === "admin" && impact === null && <p>Checking which requests are affected…</p>}
            {mode === "admin" && impact !== null && impact.length === 0 && <p>No requests are attached to this slot.</p>}
            {pending.length > 0 && (
              <p>
                <strong>Will be declined:</strong> {pending.map((i) => i.studentName).join(", ")}
              </p>
            )}
            {accepted.length > 0 && (
              <p className="text-destructive">
                <strong>Will cancel the accepted session with:</strong> {accepted.map((i) => i.studentName).join(", ")}. They and the professional are notified.
              </p>
            )}
          </div>
        }
        onConfirm={async () => {
          const r = await actions.remove(deleting!.id);
          if (!r.ok) {
            toast.error(r.error);
            return false;
          }
          toast.success("Slot deleted");
        }}
      />
    </div>
  );
}
