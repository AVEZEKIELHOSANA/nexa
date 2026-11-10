"use client";

import Link from "next/link";
import { DataTable, type Column } from "@/components/data-table";
import { EmptyState } from "@/components/empty-state";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import type { AdminReport } from "@/lib/data/reports";
import { formatDate } from "@/lib/format";

const TARGET_LABEL = { professional: "Professional", student: "Student", message: "Message" } as const;

export function ReportsTable({ reports, total, page, pageSize, status, selectedId }: { reports: AdminReport[]; total: number; page: number; pageSize: number; status: string; selectedId?: string }) {
  const columns: Column<AdminReport>[] = [
    { key: "status", header: "Status", cell: (r) => <StatusBadge status={r.status} /> },
    {
      key: "about",
      header: "About",
      cell: (r) => (
        <div>
          <Badge>{TARGET_LABEL[r.targetType]}</Badge> <span className="font-medium">{r.targetName ?? "Unknown"}</span>
        </div>
      ),
    },
    { key: "reason", header: "Reason", cell: (r) => <p className="line-clamp-2 max-w-sm text-sm text-muted-foreground">{r.reason}</p> },
    { key: "reporter", header: "Reported by", cell: (r) => r.reporterName },
    { key: "date", header: "Filed", cell: (r) => <span className="whitespace-nowrap text-muted-foreground">{formatDate(r.createdAt)}</span> },
    {
      key: "actions",
      header: "",
      className: "text-right",
      cell: (r) => (
        <Link href={`/admin/reports?${new URLSearchParams({ ...(status !== "open" ? { status } : {}), ...(page > 1 ? { page: String(page) } : {}), report: r.id })}`} scroll className={buttonVariants({ size: "sm", variant: r.id === selectedId ? "secondary" : "outline" })}>
          {r.id === selectedId ? "Viewing" : "Review"}
        </Link>
      ),
    },
  ];
  return (
    <DataTable
      columns={columns}
      rows={reports}
      rowKey={(r) => r.id}
      total={total}
      page={page}
      pageSize={pageSize}
      caption="Reports"
      empty={<EmptyState title={status === "open" ? "No open reports" : "No reports"} description="Nothing needs your attention here." />}
    />
  );
}
