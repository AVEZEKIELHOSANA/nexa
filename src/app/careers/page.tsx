import type { Metadata } from "next";
import { CareerCard } from "@/components/career-card";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Pagination } from "@/components/pagination";
import { SearchBox } from "@/components/table-filters";
import { listCareerDirectory } from "@/lib/data/career-directory";
import { param, parsePage, type SearchParams } from "@/lib/pagination";

export const metadata: Metadata = { title: "Browse careers" };

const SIZE = 24;

export default async function CareersPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const page = parsePage(sp);
  const q = param(sp, "q");
  const { careers, total } = await listCareerDirectory({ search: q, page, pageSize: SIZE });

  return (
    <>
      <PageHeader title="Browse careers" description="Pick a field you are curious about and talk to verified professionals who work in it." />
      <div className="space-y-5">
        <SearchBox placeholder="Search careers" />
        {careers.length === 0 ? (
          <EmptyState title={q ? "No career matches your search" : "No careers yet"} description={q ? "Try a different word." : "Careers will appear here once an administrator adds them."} />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {careers.map((c) => (
              <CareerCard key={c.id} career={c} />
            ))}
          </div>
        )}
        <Pagination page={page} total={total} pageSize={SIZE} />
      </div>
    </>
  );
}
