"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { answerConnectionAction } from "@/lib/actions/peers";

export function ConnectionActions({ connectionId, name }: { connectionId: string; name: string }) {
  const [pending, startTransition] = useTransition();
  function answer(accept: boolean) {
    startTransition(async () => {
      const r = await answerConnectionAction(connectionId, accept);
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success(accept ? `You are now connected with ${name}` : "Request declined");
    });
  }
  return (
    <div className="flex gap-2">
      <Button size="sm" onClick={() => answer(true)} disabled={pending}>
        Accept
      </Button>
      <Button size="sm" variant="outline" onClick={() => answer(false)} disabled={pending}>
        Decline
      </Button>
    </div>
  );
}
