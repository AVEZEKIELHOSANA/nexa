"use client";

import * as React from "react";
import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Modal built on the native <dialog> element: focus is trapped, Escape closes it, and the page
 * behind is inert. No extra dependency. Children are only rendered while open, so a form inside
 * starts empty every time it opens.
 *
 *   <Modal open={open} onClose={() => setOpen(false)} title="Edit role">...</Modal>
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        // a click on the backdrop (the dialog element itself, not its content) closes it
        if (e.target === ref.current) onClose();
      }}
      className={cn(
        "m-auto w-[min(94vw,34rem)] max-h-[90vh] rounded-lg border bg-card p-0 text-card-foreground shadow-xl backdrop:bg-black/50",
        className
      )}
      aria-labelledby="modal-title"
    >
      {open && (
        <div className="max-h-[90vh] overflow-y-auto p-5">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div className="space-y-1">
              <h2 id="modal-title" className="text-lg font-semibold leading-tight">
                {title}
              </h2>
              {description && <p className="text-sm text-muted-foreground">{description}</p>}
            </div>
            <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label="Close" className="-mr-2 -mt-2 shrink-0">
              <X className="h-4 w-4" />
            </Button>
          </div>
          {children}
        </div>
      )}
    </dialog>
  );
}

/** Row of buttons at the bottom of a modal form. */
export function ModalActions({ children }: { children: React.ReactNode }) {
  return <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">{children}</div>;
}

/**
 * ConfirmDialog: used before anything destructive (decline, cancel, reject, delete).
 * `onConfirm` may be async; the button shows a busy state and the dialog closes when it returns
 * true (or nothing). Return false to keep the dialog open (e.g. after showing an error toast).
 * Pass `children` for an extra field such as a reason; use `confirmDisabled` until it is valid.
 */
export function ConfirmDialog({
  open,
  onClose,
  title,
  description,
  confirmLabel = "Confirm",
  destructive = false,
  confirmDisabled = false,
  onConfirm,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  destructive?: boolean;
  confirmDisabled?: boolean;
  onConfirm: () => Promise<boolean | void> | boolean | void;
  children?: React.ReactNode;
}) {
  const [busy, setBusy] = useState(false);

  async function handle() {
    setBusy(true);
    try {
      const result = await onConfirm();
      if (result !== false) onClose();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={busy ? () => {} : onClose} title={title}>
      {description && <div className="text-sm text-muted-foreground">{description}</div>}
      {children && <div className="mt-4">{children}</div>}
      <ModalActions>
        <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        <Button type="button" variant={destructive ? "destructive" : "default"} onClick={handle} disabled={busy || confirmDisabled}>
          {busy ? "Please wait…" : confirmLabel}
        </Button>
      </ModalActions>
    </Modal>
  );
}
