"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { DataTable, type Column } from "@/components/data-table";
import { EmptyState } from "@/components/empty-state";
import { RowMenu } from "@/components/row-menu";
import { FilterSelect, SearchBox } from "@/components/table-filters";
import { Avatar } from "@/components/ui/avatar";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/modal";
import type { ProfessionalApplication } from "@/lib/data/admin-verification";
import { formatDate } from "@/lib/format";
import { deleteUserAction, resetPasswordAction, setUserActiveAction } from "../users/actions";

export function ProfessionalsManager({ professionals, total, page, pageSize, careers, currentUserId }: { professionals: ProfessionalApplication[]; total: number; page: number; pageSize: number; careers: { id: string; name: string }[]; currentUserId: string }) {
  const [toggling, setToggling] = useState<ProfessionalApplication | null>(null);
  const [resetting, setResetting] = useState<ProfessionalApplication | null>(null);
  const [deleting, setDeleting] = useState<ProfessionalApplication | null>(null);

  const columns: Column<ProfessionalApplication>[] = [
    {
      key: "who",
      header: "Professional",
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
    { key: "career", header: "Career", cell: (p) => (<div><p>{p.careerName}</p>{p.experienceYears !== null && <p className="text-xs text-muted-foreground">{p.experienceYears} yr experience</p>}</div>) },
    { key: "verification", header: "Verification", cell: (p) => (<div className="space-y-1"><StatusBadge status={p.status} />{!p.hasCredentials && p.status === "pending" && <p className="text-xs text-muted-foreground">No credentials yet</p>}</div>) },
    { key: "account", header: "Account", cell: (p) => <Badge tone={p.isActive ? "success" : "warning"}>{p.isActive ? "Active" : "Inactive"}</Badge> },
    { key: "applied", header: "Applied", cell: (p) => <span className="whitespace-nowrap text-muted-foreground">{formatDate(p.appliedAt)}</span> },
    {
      key: "actions",
      header: "",
      className: "text-right",
      cell: (p) => (
        <div className="flex items-center justify-end gap-1">
          {p.status === "pending" && (
            <Link href="/admin/verification" className="rounded-md px-2 py-1 text-sm font-medium text-primary hover:underline">
              Review
            </Link>
          )}
          <RowMenu
            items={[
              { label: "Send password reset", onSelect: () => setResetting(p) },
              ...(p.userId !== currentUserId
                ? [
                    { label: p.isActive ? "Deactivate" : "Activate", onSelect: () => setToggling(p) },
                    { label: "Delete…", onSelect: () => setDeleting(p), destructive: true },
                  ]
                : []),
            ]}
          />
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
      <DataTable columns={columns} rows={professionals} rowKey={(p) => p.userId} total={total} page={page} pageSize={pageSize} caption="Professionals" empty={<EmptyState title="No professionals match" description="Change the search or the filters." />} />

      <ConfirmDialog
        open={!!toggling}
        onClose={() => setToggling(null)}
        title={toggling?.isActive ? "Deactivate this professional?" : "Activate this professional?"}
        description={toggling?.isActive ? `${toggling?.name} will not be able to sign in and will disappear from the directory until you activate the account again.` : `${toggling?.name} will be able to sign in again.`}
        confirmLabel={toggling?.isActive ? "Deactivate" : "Activate"}
        destructive={!!toggling?.isActive}
        onConfirm={async () => {
          const r = await setUserActiveAction(toggling!.userId, !toggling!.isActive);
          if (!r.ok) {
            toast.error(r.error);
            return false;
          }
          toast.success(toggling!.isActive ? "Professional deactivated" : "Professional activated");
        }}
      />
      <ConfirmDialog
        open={!!resetting}
        onClose={() => setResetting(null)}
        title="Send a password reset?"
        description={`An email with a reset link goes to ${resetting?.email ?? resetting?.name}.`}
        confirmLabel="Send email"
        onConfirm={async () => {
          const r = await resetPasswordAction(resetting!.userId);
          if (!r.ok) {
            toast.error(r.error);
            return false;
          }
          toast.success("Reset email sent");
        }}
      />
      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        title="Delete this professional?"
        description={`${deleting?.name}'s open sessions and slots are cancelled and students are notified. If nothing else refers to them the account is removed completely; otherwise it is anonymised and the login blocked. This cannot be undone.`}
        confirmLabel="Delete professional"
        destructive
        onConfirm={async () => {
          const r = await deleteUserAction(deleting!.userId);
          if (!r.ok) {
            toast.error(r.error);
            return false;
          }
          toast.success(r.data.mode === "hard" ? "Professional deleted" : "Professional anonymised and blocked");
        }}
      />
    </div>
  );
}
