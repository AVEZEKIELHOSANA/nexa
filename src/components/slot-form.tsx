"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { ModalActions } from "@/components/ui/modal";
import { DateTimePicker, type DateTimeValue } from "@/components/date-time-picker";
import type { ActionResult } from "@/lib/action";
import { utcToZonedParts } from "@/lib/format";
import type { SlotFormValues } from "@/lib/slots";

export type SlotFormInitial = { startTime: string; endTime: string; meetingUrl: string | null };

/**
 * SlotForm: add or edit one availability slot. Shared by the professional's My Availability and the
 * admin's Professional Availability screens; the caller supplies `onSubmit` (a Server Action).
 * `linkOnly` is for booked slots, where an admin may still correct the meeting link but nothing else.
 */
export function SlotForm({
  initial,
  submitLabel = "Save slot",
  linkOnly = false,
  onSubmit,
  onDone,
  onCancel,
}: {
  initial?: SlotFormInitial;
  submitLabel?: string;
  linkOnly?: boolean;
  onSubmit: (values: SlotFormValues) => Promise<ActionResult>;
  onDone: () => void;
  onCancel: () => void;
}) {
  const start = initial ? utcToZonedParts(initial.startTime) : null;
  const end = initial ? utcToZonedParts(initial.endTime) : null;
  const [when, setWhen] = useState<DateTimeValue>({ date: start?.date ?? "", startTime: start?.time ?? "", endTime: end?.time ?? "" });
  const [meetingUrl, setMeetingUrl] = useState(initial?.meetingUrl ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!linkOnly && when.startTime && when.endTime && when.endTime <= when.startTime) {
      return setError("The end time must be after the start time.");
    }
    setBusy(true);
    const r = await onSubmit({ date: when.date, startTime: when.startTime, endTime: when.endTime, meetingUrl });
    setBusy(false);
    if (!r.ok) return setError(r.error);
    onDone();
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {linkOnly ? (
        <p className="rounded-md bg-muted p-3 text-sm text-muted-foreground">This slot is booked, so only the meeting link can be changed.</p>
      ) : (
        <DateTimePicker value={when} onChange={setWhen} />
      )}
      <Field
        label="Meeting link"
        htmlFor="slot-link"
        hint="Optional. Zoom, Google Meet, Teams… Shown only to you, the student whose request you accept, and administrators."
      >
        <Input id="slot-link" type="url" inputMode="url" placeholder="https://meet.example.com/…" value={meetingUrl} onChange={(e) => setMeetingUrl(e.target.value)} maxLength={500} />
      </Field>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <ModalActions>
        <Button type="button" variant="outline" onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
        <Button type="submit" disabled={busy}>
          {busy ? "Saving…" : submitLabel}
        </Button>
      </ModalActions>
    </form>
  );
}
