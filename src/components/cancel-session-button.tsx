"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, Textarea } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/ui/modal";
import { cancelSessionAction } from "@/lib/actions/sessions";

/**
 * "Cancel session" / "Withdraw request" with a confirm dialog and an optional reason that the other
 * person sees. `kind` only changes the wording; the database function decides who may do what.
 */
export function CancelSessionButton({
  requestId,
  kind = "cancel",
  otherName,
  size = "sm",
  onDone,
}: {
  requestId: string;
  kind?: "cancel" | "withdraw";
  otherName: string;
  size?: "sm" | "default";
  onDone?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const withdraw = kind === "withdraw";

  return (
    <>
      <Button
        size={size}
        variant="outline"
        className="text-destructive"
        onClick={() => {
          setReason("");
          setOpen(true);
        }}
      >
        {withdraw ? "Withdraw request" : "Cancel session"}
      </Button>
      <ConfirmDialog
        open={open}
        onClose={() => setOpen(false)}
        title={withdraw ? "Withdraw this request?" : "Cancel this session?"}
        description={
          withdraw
            ? `${otherName} will no longer see your request. The time slot stays open for others.`
            : `The session with ${otherName} is cancelled, the time slot opens up again, and they are notified.`
        }
        confirmLabel={withdraw ? "Withdraw request" : "Cancel session"}
        destructive
        onConfirm={async () => {
          const r = await cancelSessionAction(requestId, reason);
          if (!r.ok) {
            toast.error(r.error);
            return false;
          }
          toast.success(withdraw ? "Request withdrawn" : "Session cancelled");
          onDone?.();
        }}
      >
        <Field label="Reason (optional)" htmlFor={`cancel-reason-${requestId}`} hint="Shown to the other person.">
          <Textarea id={`cancel-reason-${requestId}`} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} rows={3} />
        </Field>
      </ConfirmDialog>
    </>
  );
}
