"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, Textarea } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/ui/modal";
import { acceptRequestAction, declineRequestAction } from "@/lib/actions/sessions";

/** Accept / Decline for a professional's pending request, each behind a confirm dialog. */
export function RequestActions({ requestId, studentName }: { requestId: string; studentName: string }) {
  const [accepting, setAccepting] = useState(false);
  const [declining, setDeclining] = useState(false);
  const [reason, setReason] = useState("");

  return (
    <>
      <Button size="sm" onClick={() => setAccepting(true)}>
        Accept
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={() => {
          setReason("");
          setDeclining(true);
        }}
      >
        Decline
      </Button>

      <ConfirmDialog
        open={accepting}
        onClose={() => setAccepting(false)}
        title="Accept this request?"
        description={`The slot is booked for ${studentName}. Other students who asked for the same time are told it is taken, and ${studentName} is notified.`}
        confirmLabel="Accept"
        onConfirm={async () => {
          const r = await acceptRequestAction(requestId);
          if (!r.ok) {
            toast.error(r.error);
            return false;
          }
          toast.success(`Session booked with ${studentName}`);
        }}
      />

      <ConfirmDialog
        open={declining}
        onClose={() => setDeclining(false)}
        title="Decline this request?"
        description={`${studentName} is notified. The slot stays open for other students.`}
        confirmLabel="Decline"
        destructive
        onConfirm={async () => {
          const r = await declineRequestAction(requestId, reason);
          if (!r.ok) {
            toast.error(r.error);
            return false;
          }
          toast.success("Request declined");
        }}
      >
        <Field label="Reason (optional)" htmlFor={`decline-reason-${requestId}`} hint="Shown to the student. A kind, short reason helps them try again.">
          <Textarea id={`decline-reason-${requestId}`} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} rows={3} />
        </Field>
      </ConfirmDialog>
    </>
  );
}
