"use client";

import { useState } from "react";
import { toast } from "sonner";
import { DataTable, type Column } from "@/components/data-table";
import { EmptyState } from "@/components/empty-state";
import { RowMenu } from "@/components/row-menu";
import { FilterSelect, SearchBox } from "@/components/table-filters";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/modal";
import type { AdminStudent } from "@/lib/data/admin-students";
import { formatDate } from "@/lib/format";
import { deleteUserAction, resetPasswordAction, setUserActiveAction } from "../users/actions";

export function StudentsManager({ students, total, page, pageSize, currentUserId }: { students: AdminStudent[]; total: number; page: number; pageSize: number; currentUserId: string }) {
  const [toggling, setToggling] = useState<AdminStudent | null>(null);
  const [resetting, setResetting] = useState<AdminStudent | null>(null);
  const [deleting, setDeleting] = useState<AdminStudent | null>(null);

  const columns: Column<AdminStudent>[] = [
    {
      key: "name",
      header: "Student",
      cell: (s) => (
        <div className="flex items-center gap-3">
          <Avatar name={s.name} />
          <div className="min-w-0">
            <p className="truncate font-medium">{s.name}</p>
            <p className="truncate text-xs text-muted-foreground">{s.email ?? "no email"}</p>
          </div>
        </div>
      ),
    },
    { key: "age", header: "Age group", cell: (s) => <Badge>{s.isMinor ? "Under 18" : "18 or over"}</Badge> },
    {
      key: "status",
      header: "Status",
      cell: (s) =>
        s.consent === "awaiting" ? <Badge tone="warning">Awaiting guardian</Badge> : !s.isActive ? <Badge tone="warning">Inactive</Badge> : <Badge tone="success">Active</Badge>,
    },
    { key: "use", header: "Activity", cell: (s) => <span className="whitespace-nowrap text-xs text-muted-foreground">{s.sessions} session{s.sessions === 1 ? "" : "s"} · {s.coursesCompleted} course{s.coursesCompleted === 1 ? "" : "s"} · {s.interestCount} interest{s.interestCount === 1 ? "" : "s"}</span> },
    { key: "joined", header: "Joined", cell: (s) => <span className="whitespace-nowrap text-muted-foreground">{formatDate(s.createdAt)}</span> },
    { key: "last", header: "Last sign-in", cell: (s) => <span className="whitespace-nowrap text-muted-foreground">{s.lastSignInAt ? formatDate(s.lastSignInAt) : "Never"}</span> },
    {
      key: "actions",
      header: "",
      className: "text-right",
      cell: (s) => (
        <RowMenu
          items={[
            { label: "Send password reset", onSelect: () => setResetting(s) },
            ...(s.id !== currentUserId
              ? [
                  { label: s.isActive ? "Deactivate" : "Activate", onSelect: () => setToggling(s) },
                  { label: "Delete…", onSelect: () => setDeleting(s), destructive: true },
                ]
              : []),
          ]}
        />
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <SearchBox placeholder="Search name or email" />
        <FilterSelect
          param="status"
          label="Any status"
          options={[
            { value: "active", label: "Active" },
            { value: "inactive", label: "Inactive" },
            { value: "awaiting_consent", label: "Awaiting guardian" },
          ]}
        />
      </div>
      <DataTable columns={columns} rows={students} rowKey={(s) => s.id} total={total} page={page} pageSize={pageSize} caption="Students" empty={<EmptyState title="No students match" description="Change the search or the filter." />} />

      <ConfirmDialog
        open={!!toggling}
        onClose={() => setToggling(null)}
        title={toggling?.isActive ? "Deactivate this student?" : "Activate this student?"}
        description={toggling?.isActive ? `${toggling?.name} will not be able to sign in or use the platform until you activate the account again.` : `${toggling?.name} will be able to sign in again.${toggling?.consent === "awaiting" ? " Their guardian has not confirmed yet: activating bypasses that check." : ""}`}
        confirmLabel={toggling?.isActive ? "Deactivate" : "Activate"}
        destructive={!!toggling?.isActive}
        onConfirm={async () => {
          const r = await setUserActiveAction(toggling!.id, !toggling!.isActive);
          if (!r.ok) {
            toast.error(r.error);
            return false;
          }
          toast.success(toggling!.isActive ? "Student deactivated" : "Student activated");
        }}
      />
      <ConfirmDialog
        open={!!resetting}
        onClose={() => setResetting(null)}
        title="Send a password reset?"
        description={`An email with a reset link goes to ${resetting?.email ?? resetting?.name}.`}
        confirmLabel="Send email"
        onConfirm={async () => {
          const r = await resetPasswordAction(resetting!.id);
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
        title="Delete this student?"
        description={`${deleting?.name}'s open sessions are cancelled. If nothing else refers to them the account is removed completely; otherwise it is anonymised and the login blocked. This cannot be undone.`}
        confirmLabel="Delete student"
        destructive
        onConfirm={async () => {
          const r = await deleteUserAction(deleting!.id);
          if (!r.ok) {
            toast.error(r.error);
            return false;
          }
          toast.success(r.data.mode === "hard" ? "Student deleted" : "Student anonymised and blocked");
        }}
      />
    </div>
  );
}
