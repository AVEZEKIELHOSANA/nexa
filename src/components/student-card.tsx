"use client";

import { useTransition } from "react";
import { Check, Clock, UserPlus } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { connectAction } from "@/lib/actions/peers";
import type { Peer } from "@/lib/data/peers";

/** StudentCard: first name, shared interests and a Connect button. Never shows a surname, school or contact detail. */
export function StudentCard({ peer }: { peer: Peer }) {
  const [pending, startTransition] = useTransition();

  function connect() {
    startTransition(async () => {
      const r = await connectAction(peer.id);
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success(`Request sent to ${peer.firstName}`);
    });
  }

  return (
    <Card className="h-full">
      <CardContent className="flex h-full flex-col gap-3 p-4">
        <div className="flex items-center gap-3">
          <Avatar name={peer.firstName} />
          <div className="min-w-0">
            <p className="truncate font-medium">{peer.firstName}</p>
            {peer.sharedCount > 0 && <p className="text-xs text-muted-foreground">{peer.sharedCount} interest{peer.sharedCount === 1 ? "" : "s"} in common</p>}
          </div>
        </div>
        <ul className="flex flex-wrap gap-1.5" aria-label="Interests">
          {peer.interestNames.length === 0 && <li className="text-xs text-muted-foreground">No interests listed</li>}
          {peer.interestNames.map((n) => (
            <li key={n}>
              <Badge>{n}</Badge>
            </li>
          ))}
        </ul>
        <div className="mt-auto pt-1">
          {peer.connection === "none" && (
            <Button size="sm" onClick={connect} disabled={pending} className="w-full">
              <UserPlus className="h-4 w-4" aria-hidden /> {pending ? "Sending…" : "Connect"}
            </Button>
          )}
          {peer.connection === "sent" && (
            <p className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" aria-hidden /> Request sent
            </p>
          )}
          {peer.connection === "received" && (
            <Link href="/student/peers/connections?tab=received" className="text-sm font-medium text-primary hover:underline">
              Wants to connect: answer
            </Link>
          )}
          {peer.connection === "connected" && (
            <p className="inline-flex items-center gap-1.5 text-sm text-emerald-700 dark:text-emerald-300">
              <Check className="h-4 w-4" aria-hidden /> Connected
            </p>
          )}
          {peer.connection === "declined" && <p className="text-sm text-muted-foreground">Not available</p>}
        </div>
      </CardContent>
    </Card>
  );
}
