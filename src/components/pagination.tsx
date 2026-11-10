"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUrlParams } from "@/components/use-url-params";
import { totalPages } from "@/lib/pagination";

/** Pagination control: Previous / Next with "Page 2 of 5". Reads and writes ?page in the URL. */
export function Pagination({ page, total, pageSize }: { page: number; total: number; pageSize: number }) {
  const { set, pending } = useUrlParams();
  const pages = totalPages(total, pageSize);
  if (total <= pageSize) {
    return total > 0 ? <p className="text-sm text-muted-foreground">{total} result{total === 1 ? "" : "s"}</p> : null;
  }
  return (
    <nav className="flex items-center justify-between gap-3" aria-label="Pagination">
      <p className="text-sm text-muted-foreground">
        {total} results · Page {page} of {pages}
      </p>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" disabled={page <= 1 || pending} onClick={() => set({ page: String(page - 1) }, false)}>
          <ChevronLeft className="h-4 w-4" /> Previous
        </Button>
        <Button variant="outline" size="sm" disabled={page >= pages || pending} onClick={() => set({ page: String(page + 1) }, false)}>
          Next <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </nav>
  );
}
