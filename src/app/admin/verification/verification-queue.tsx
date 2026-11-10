"use client";

import { useState } from "react";
import { ExternalLink, FileWarning } from "lucide-react";
import { toast } from "sonner";
import { DataTable, type Column } from "@/components/data-table";
import { EmptyState } from "@/components/empty-state";
import { FilterSelect, SearchBox } from "@/components/table-filters";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { Field, Textarea } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/ui/modal";
import type { ProfessionalApplication, VerificationStatus } from "@/lib/data/admin-verification";
import { formatDate } from "@/lib/format";
import { getCredentialsUrlAction, rejectProfessionalAction, verifyProfessionalAction } from "./actions";

export function VerificationQueue({
  professionals,
  total,
  page,
  pageSize,
  status,
  careers,
}: {
  professionals: ProfessionalApplication[];
  total: number;
  page: number;
  pageSize: number;
  status: VerificationStatus;
  careers: { id: string; name: string }[];
}) {
  const [approving, setApproving] = useState<ProfessionalApplication | null>(null);
  const [rejecting, setRejecting] = useState<ProfessionalApplication | null>(null);
  const [reason, setReason] = useState("");
  const [opening, setOpening] = useState<string | null>(null);

  async function openCredentials(p: ProfessionalApplication) {
    // Open the tab synchronously (inside the click) so pop-up blockers allow it, then point it at the signed link.
    const tab = window.open("about:blank", "_blank");
    setOpening(p.userId);
    const r = await getCredentialsUrlAction(p.userId);
    setOpening(null);
    if (!r.ok) {
      tab?.close();
      toast.error(r.error);
      return;
    }
    if (tab) {
      tab.opener = null;
      tab.location.href = r.data.url;
    } else {
      toast.error("Your browser blocked the new tab. Allow pop-ups for this site and try again.");
    }
  }

  const columns: Column<ProfessionalApplication>[] = [
    {
      key: "who",
      header: "Applicant",
      cell: (p) => (
        <div className="flex items-center gap-3">
          <Avatar name={p.name} />
          <div className="min-w-0">
            <p className="truncate font-medium">{p.name}</p>
            <p className="truncate text-xs text-muted-foreground">{p.email ?? "no email"}</p>
          </div>
        </div>
      ),
    },
    {
      key: "career",
      header: "Career",
      cell: (p) => (
        <div>
          <p>{p.careerName}</p>
          {p.experienceYears !== null && <p className="text-xs text-muted-foreground">{p.experienceYears} yr experience</p>}
        </div>
      ),
    },
    {
      key: "bio",
      header: "About",
      cell: (p) => <p className="line-clamp-3 max-w-xs text-xs text-muted-foreground">{p.bio || "No bio yet."}</p>,
    },
    {
      key: "credentials",
      header: "Credentials",
      cell: (p) =>
        p.hasCredentials ? (
          <Button size="sm" variant="outline" onClick={() => openCredentials(p)} disabled={opening === p.userId}>
            <ExternalLink className="h-3.5 w-3.5" /> {opening === p.userId ? "Opening…" : "Open file"}
          </Button>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs text-amber-700 dark:text-amber-300">
            <FileWarning className="h-3.5 w-3.5" /> Not uploaded
          </span>
        ),
    },
    {
      key: "status",
      header: "Status",
      cell: (p) => (
        <div className="space-y-0.5">
          <StatusBadge status={p.status} />
          <p className="text-xs text-muted-foreground">{p.status === "verified" && p.verifiedAt ? formatDate(p.verifiedAt) : `Applied ${formatDate(p.appliedAt)}`}</p>
          {p.status === "rejected" && p.rejectionReason && <p className="max-w-48 text-xs text-muted-foreground">“{p.rejectionReason}”</p>}
        </div>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "text-right",
      cell: (p) => (
        <div className="flex justify-end gap-1">
          {p.status !== "verified" && (
            <Button size="sm" onClick={() => setApproving(p)} disabled={!p.hasCredentials} title={!p.hasCredentials ? "Credentials must be uploaded first" : undefined}>
              Approve
            </Button>
          )}
          {p.status !== "rejected" && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setReason("");
                setRejecting(p);
              }}
            >
              Reject
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <SearchBox placeholder="Search name or email" />
        <FilterSelect param="career" label="All careers" options={careers.map((c) => ({ value: c.id, label: c.name }))} />
      </div>

      <DataTable
        columns={columns}
        rows={professionals}
        rowKey={(p) => p.userId}
        total={total}
        page={page}
        pageSize={pageSize}
        caption="Professional applications"
        empty={
          <EmptyState
            title={status === "pending" ? "No applications waiting" : `No ${status} professionals`}
            description={status === "pending" ? "New professional sign-ups appear here for review." : "Try another tab or clear the filters."}
          />
        }
      />

      <ConfirmDialog
        open={!!approving}
        onClose={() => setApproving(null)}
        title="Approve this professional?"
        description={`${approving?.name} will appear to students as a verified ${approving?.careerName} professional and can publish availability. They are notified.`}
        confirmLabel="Approve"
        onConfirm={async () => {
          const r = await verifyProfessionalAction(approving!.userId);
          if (!r.ok) {
            toast.error(r.error);
            return false;
          }
          toast.success(`${approving!.name} is now verified`);
        }}
      />

      <ConfirmDialog
        open={!!rejecting}
        onClose={() => setRejecting(null)}
        title="Reject this application?"
        description={`${rejecting?.name} is told the reason and can upload new credentials to apply again. Their open slots are hidden from students.`}
        confirmLabel="Reject"
        destructive
        confirmDisabled={reason.trim().length < 5}
        onConfirm={async () => {
          const r = await rejectProfessionalAction(rejecting!.userId, reason);
          if (!r.ok) {
            toast.error(r.error);
            return false;
          }
          toast.success("Application rejected");
        }}
      >
        <Field label="Reason (shown to the professional)" htmlFor="reject-reason" hint="At least 5 characters. Be specific: what is missing or unclear?">
          <Textarea id="reject-reason" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} rows={3} />
        </Field>
      </ConfirmDialog>
    </div>
  );
}
