"use client";

import { useState } from "react";
import { CheckCircle2, Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Textarea } from "@/components/ui/input";
import { Modal, ModalActions } from "@/components/ui/modal";
import { submitReportAction } from "@/lib/actions/reports";
import type { ReportTarget } from "@/lib/data/reports";

/**
 * "Report a concern" modal (no route). Put <ReportConcernButton> anywhere a person, or a message,
 * can be reported; it opens this dialog with the reason field and a confirmation state.
 */
export function ReportConcernButton({ targetType, targetId, targetLabel, variant = "button" }: { targetType: ReportTarget; targetId: string; targetLabel: string; variant?: "button" | "icon" }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      {variant === "icon" ? (
        <button type="button" onClick={() => setOpen(true)} aria-label={`Report ${targetLabel}`} title="Report" className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground">
          <Flag className="h-3.5 w-3.5" />
        </button>
      ) : (
        <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
          <Flag className="h-4 w-4" /> Report
        </Button>
      )}
      <ReportConcernDialog open={open} onClose={() => setOpen(false)} targetType={targetType} targetId={targetId} targetLabel={targetLabel} />
    </>
  );
}

export function ReportConcernDialog({ open, onClose, targetType, targetId, targetLabel }: { open: boolean; onClose: () => void; targetType: ReportTarget; targetId: string; targetLabel: string }) {
  return (
    <Modal open={open} onClose={onClose} title="Report a concern" description={`About ${targetLabel}. Only Nexa administrators will read this.`}>
      {open && <ReportForm onClose={onClose} targetType={targetType} targetId={targetId} />}
    </Modal>
  );
}

function ReportForm({ onClose, targetType, targetId }: { onClose: () => void; targetType: ReportTarget; targetId: string }) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const r = await submitReportAction({ targetType, targetId, reason });
    setBusy(false);
    if (!r.ok) return setError(r.error);
    setDone(true);
  }

  if (done) {
    return (
      <div className="space-y-4 text-center">
        <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" aria-hidden />
        <div className="space-y-1">
          <p className="font-medium">Thank you. Your report was sent.</p>
          <p className="text-sm text-muted-foreground">An administrator will review it. If someone is in immediate danger, contact local emergency services.</p>
        </div>
        <Button onClick={onClose}>Close</Button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="What happened?" htmlFor="report-reason" hint="Be as specific as you can. At least 5 characters.">
        <Textarea id="report-reason" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={2000} rows={5} required />
      </Field>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <ModalActions>
        <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        <Button type="submit" disabled={busy || reason.trim().length < 5}>
          {busy ? "Sending…" : "Send report"}
        </Button>
      </ModalActions>
    </form>
  );
}
