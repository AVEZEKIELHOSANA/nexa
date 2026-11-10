"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/ui/modal";
import { deleteMyAccountAction } from "@/lib/actions/settings";

/** "Delete my account": a typed confirmation, then the Edge Function does the work and the person is sent home. */
export function DeleteAccountCard() {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  return (
    <Card className="border-destructive/40">
      <CardHeader>
        <CardTitle>Delete my account</CardTitle>
        <CardDescription>
          Your sessions that are still open are cancelled and your login stops working for good. If other people have records with you (past sessions, messages), those stay but your name is removed.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button variant="destructive" onClick={() => { setText(""); setOpen(true); }}>
          Delete my account…
        </Button>
      </CardContent>
      <ConfirmDialog
        open={open}
        onClose={() => setOpen(false)}
        title="Delete your account?"
        description="This cannot be undone. Type DELETE to confirm."
        confirmLabel="Delete my account"
        destructive
        confirmDisabled={text.trim() !== "DELETE"}
        onConfirm={async () => {
          const r = await deleteMyAccountAction(text);
          if (!r.ok) {
            toast.error(r.error);
            return false;
          }
          window.location.assign("/?account=deleted");
        }}
      >
        <label htmlFor="delete-confirm" className="sr-only">
          Type DELETE to confirm
        </label>
        <Input id="delete-confirm" value={text} onChange={(e) => setText(e.target.value)} autoComplete="off" placeholder="DELETE" />
      </ConfirmDialog>
    </Card>
  );
}
