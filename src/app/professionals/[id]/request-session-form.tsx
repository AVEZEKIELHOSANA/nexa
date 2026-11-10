"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, Textarea } from "@/components/ui/input";
import { SlotPicker, type PickerSlot } from "@/components/slot-picker";
import { formatDayHeading, formatTimeRange } from "@/lib/format";
import { requestSessionAction } from "./actions";

const MAX = 1000;

/**
 * Picker + "Request session" form for one professional. Selecting a slot reveals the message field;
 * submitting calls the request_session database function through a Server Action.
 */
export function RequestSessionForm({ professionalId, professionalName, slots, requestedSlotIds }: { professionalId: string; professionalName: string; slots: PickerSlot[]; requestedSlotIds: string[] }) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const selected = slots.find((s) => s.id === selectedId) ?? null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setBusy(true);
    setError("");
    const r = await requestSessionAction({ professionalId, slotId: selected.id, message });
    setBusy(false);
    if (!r.ok) {
      setError(r.error);
      router.refresh(); // the slot may have just been taken: show the current list
      return;
    }
    toast.success("Request sent. You will be notified when the professional answers.");
    router.push(`/student/requests/${r.data.requestId}`);
  }

  return (
    <div className="space-y-6">
      <SlotPicker slots={slots} selectedId={selectedId} onSelect={setSelectedId} unavailableIds={requestedSlotIds} />

      {selected && (
        <form onSubmit={submit} className="space-y-4 rounded-lg border bg-muted/30 p-4" aria-label="Request session">
          <div>
            <h3 className="font-semibold">Request this session</h3>
            <p className="text-sm text-muted-foreground">
              {professionalName} · {formatDayHeading(selected.startTime)}, {formatTimeRange(selected.startTime, selected.endTime)}
            </p>
          </div>
          <Field label="Message (optional)" htmlFor="request-message" hint="Introduce yourself and say what you would like to talk about.">
            <Textarea id="request-message" value={message} onChange={(e) => setMessage(e.target.value)} maxLength={MAX} rows={4} />
          </Field>
          <p className="text-right text-xs text-muted-foreground">
            {message.length}/{MAX}
          </p>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={() => setSelectedId(null)} disabled={busy}>
              Choose another time
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? "Sending…" : "Send request"}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
