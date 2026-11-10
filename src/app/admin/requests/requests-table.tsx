"use client";

import { DataTable, type Column } from "@/components/data-table";
import { EmptyState } from "@/components/empty-state";
import { FilterSelect } from "@/components/table-filters";
import { StatusBadge } from "@/components/ui/badge";
import type { AdminRequest } from "@/lib/data/admin-requests";
import { formatDate, formatDayHeading, formatTimeRange } from "@/lib/format";

export function RequestsTable({ requests, total, page, pageSize, careers }: { requests: AdminRequest[]; total: number; page: number; pageSize: number; careers: { id: string; name: string }[] }) {
  const columns: Column<AdminRequest>[] = [
    { key: "student", header: "Student", cell: (r) => <span className="font-medium">{r.studentName}</span> },
    {
      key: "pro",
      header: "Professional",
      cell: (r) => (
        <div>
          <p className="font-medium">{r.professionalName}</p>
          {r.careerName && <p className="text-xs text-muted-foreground">{r.careerName}</p>}
        </div>
      ),
    },
    {
      key: "slot",
      header: "Requested slot",
      cell: (r) => (
        <div className="whitespace-nowrap">
          <p>{formatDayHeading(r.startTime)}</p>
          <p className="text-xs text-muted-foreground">{formatTimeRange(r.startTime, r.endTime)}</p>
        </div>
      ),
    },
    { key: "status", header: "Status", cell: (r) => <StatusBadge status={r.status} /> },
    { key: "created", header: "Requested", cell: (r) => <span className="whitespace-nowrap text-muted-foreground">{formatDate(r.createdAt)}</span> },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <FilterSelect
          param="status"
          label="Any status"
          options={[
            { value: "pending", label: "Pending" },
            { value: "accepted", label: "Accepted" },
            { value: "declined", label: "Declined" },
            { value: "cancelled", label: "Cancelled" },
          ]}
        />
        <FilterSelect param="career" label="All careers" options={careers.map((c) => ({ value: c.id, label: c.name }))} />
      </div>
      <DataTable
        columns={columns}
        rows={requests}
        rowKey={(r) => r.id}
        total={total}
        page={page}
        pageSize={pageSize}
        caption="Mentorship requests"
        empty={<EmptyState title="No requests match" description="Change the filters." />}
      />
    </div>
  );
}
