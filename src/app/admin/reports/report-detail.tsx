"use client";

import { useState } from "react";
import Link from "next/link";
import { Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Textarea } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/ui/modal";
import type { AdminReport, ContextMessage, ReportContext } from "@/lib/data/reports";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { removeMessageAction, resolveReportAction } from "./actions";

/** One report in full: what was said, the conversation it is about, and the admin's two actions. */
export function ReportDetail({ report, context }: { report: AdminReport; context: ReportContext }) {
  const [removing, setRemoving] = useState<ContextMessage | null>(null);
  const [resolving, setResolving] = useState(false);
  const [notes, setNotes] = useState("");

  return (
    <Card id="report-detail">
      <CardHeader className="flex-row items-start justify-between gap-3">
        <div className="space-y-1">
          <CardTitle className="text-lg">
            Report about {report.targetType === "message" ? "a message from " : ""}
            {report.targetName ?? "an unknown person"}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Filed by {report.reporterName} on {formatDateTime(report.createdAt)} <StatusBadge status={report.status} />
          </p>
        </div>
        <Link href="/admin/reports" aria-label="Close report" className="rounded p-1.5 hover:bg-accent">
          <X className="h-4 w-4" />
        </Link>
      </CardHeader>
      <CardContent className="space-y-5">
        <section>
          <h3 className="mb-1 text-sm font-medium">What was reported</h3>
          <p className="whitespace-pre-line rounded-md bg-muted p-3 text-sm">{report.reason}</p>
        </section>

        <section>
          <h3 className="mb-2 text-sm font-medium">
            Conversation
            {context.participants && (
              <span className="ml-2 font-normal text-muted-foreground">
                {context.participants.studentName} and {context.participants.professionalName}
              </span>
            )}
          </h3>
          {context.requestId === null ? (
            <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">There is no conversation between these two people.</p>
          ) : context.messages.length === 0 ? (
            <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">No messages were sent in this conversation.</p>
          ) : (
            <ul className="max-h-96 space-y-2 overflow-y-auto rounded-md border p-3" aria-label="Reported conversation">
              {context.truncated && <li className="text-center text-xs text-muted-foreground">Showing the most recent {context.messages.length} messages.</li>}
              {context.messages.map((m) => (
                <li key={m.id} className={cn("flex items-start justify-between gap-3 rounded-md p-2 text-sm", m.id === context.highlightMessageId && "bg-amber-100 dark:bg-amber-950/60")}>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">{m.senderName}</span> · {formatDateTime(m.createdAt)}
                      {m.id === context.highlightMessageId && <Badge tone="warning" className="ml-2">Reported</Badge>}
                    </p>
                    <p className={cn("whitespace-pre-wrap break-words", m.removed && "italic text-muted-foreground line-through")}>{m.body}</p>
                    {m.removed && <p className="text-xs text-muted-foreground">Removed from the conversation.</p>}
                  </div>
                  {!m.removed && (
                    <Button variant="ghost" size="sm" className="shrink-0 text-destructive" onClick={() => setRemoving(m)}>
                      <Trash2 className="h-3.5 w-3.5" /> Remove
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        {report.status === "resolved" ? (
          <section>
            <h3 className="mb-1 text-sm font-medium">Resolution</h3>
            <p className="text-sm text-muted-foreground">Resolved {report.resolvedAt ? formatDateTime(report.resolvedAt) : ""}.</p>
            {report.resolutionNotes && <p className="mt-1 whitespace-pre-line rounded-md bg-muted p-3 text-sm">{report.resolutionNotes}</p>}
          </section>
        ) : (
          <div className="flex justify-end">
            <Button onClick={() => setResolving(true)}>Resolve report…</Button>
          </div>
        )}
      </CardContent>

      <ConfirmDialog
        open={!!removing}
        onClose={() => setRemoving(null)}
        title="Remove this message?"
        description="It disappears for both people straight away. The text stays in the database for the audit trail, and the removal is logged."
        confirmLabel="Remove message"
        destructive
        onConfirm={async () => {
          const r = await removeMessageAction(removing!.id);
          if (!r.ok) {
            toast.error(r.error);
            return false;
          }
          toast.success("Message removed");
        }}
      />

      <ConfirmDialog
        open={resolving}
        onClose={() => setResolving(false)}
        title="Resolve this report?"
        description="The person who filed it is told it was reviewed. Your notes stay private to administrators."
        confirmLabel="Resolve"
        onConfirm={async () => {
          const r = await resolveReportAction(report.id, notes);
          if (!r.ok) {
            toast.error(r.error);
            return false;
          }
          toast.success("Report resolved");
        }}
      >
        <Field label="Resolution notes (private)" htmlFor="resolution-notes" hint="What you checked and what you did. Optional but recommended.">
          <Textarea id="resolution-notes" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={2000} rows={4} />
        </Field>
      </ConfirmDialog>
    </Card>
  );
}
