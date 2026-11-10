"use client";

import * as React from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { Pagination } from "@/components/pagination";
import { useUrlParams } from "@/components/use-url-params";
import { cn } from "@/lib/utils";

export type Column<T> = {
  key: string;
  header: string;
  /** Makes the header clickable. The value is sent in ?sort= and must be understood by the query. */
  sortKey?: string;
  className?: string;
  cell: (row: T) => React.ReactNode;
};

/**
 * DataTable: sortable, paginated table driven by the URL.
 * The page (a Server Component) reads ?page, ?sort, ?dir and the filters, queries ONE page of rows
 * and passes them in with `total`. The table never filters or sorts rows itself, so it works the
 * same for 20 rows or 20,000. Because column renderers are functions, use it from a Client Component
 * (see users-manager.tsx for the pattern).
 *
 * Props: columns, rows, rowKey, total, page, pageSize, sort?, dir?, empty?, hidePagination?
 */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  total,
  page,
  pageSize,
  sort,
  dir = "asc",
  empty,
  hidePagination = false,
  caption,
}: {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  total: number;
  page: number;
  pageSize: number;
  sort?: string;
  dir?: "asc" | "desc";
  empty?: React.ReactNode;
  hidePagination?: boolean;
  caption?: string;
}) {
  const { set, pending } = useUrlParams();

  function toggleSort(sortKey: string) {
    if (sort === sortKey) set({ sort: sortKey, dir: dir === "asc" ? "desc" : "asc" }, false);
    else set({ sort: sortKey, dir: "asc" }, false);
  }

  if (rows.length === 0) {
    return <>{empty ?? <EmptyState title="Nothing to show" description="Try changing the filters." />}</>;
  }

  return (
    <div className={cn("space-y-3", pending && "opacity-60 transition-opacity")}>
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[40rem] text-left text-sm">
          {caption && <caption className="sr-only">{caption}</caption>}
          <thead className="border-b bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              {columns.map((c) => {
                const active = c.sortKey && sort === c.sortKey;
                return (
                  <th
                    key={c.key}
                    scope="col"
                    aria-sort={active ? (dir === "asc" ? "ascending" : "descending") : undefined}
                    className={cn("px-3 py-2.5 font-medium", c.className)}
                  >
                    {c.sortKey ? (
                      <button type="button" onClick={() => toggleSort(c.sortKey!)} className="inline-flex items-center gap-1 uppercase tracking-wide hover:text-foreground">
                        {c.header}
                        {active ? (dir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-40" />}
                      </button>
                    ) : (
                      c.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((row) => (
              <tr key={rowKey(row)} className="align-middle hover:bg-muted/30">
                {columns.map((c) => (
                  <td key={c.key} className={cn("px-3 py-2.5", c.className)}>
                    {c.cell(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!hidePagination && <Pagination page={page} total={total} pageSize={pageSize} />}
    </div>
  );
}
