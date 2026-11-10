import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Pagination } from "@/components/pagination";
import { StudentCard } from "@/components/student-card";
import { FilterSelect } from "@/components/table-filters";
import { buttonVariants } from "@/components/ui/button";
import { listActiveCareers } from "@/lib/data/careers";
import { listPeers } from "@/lib/data/peers";
import { isUuid, param, parsePage, type SearchParams } from "@/lib/pagination";

export const metadata: Metadata = { title: "Find peers" };

const SIZE = 12;

export default async function PeersPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const page = parsePage(sp);
  const rawCareer = param(sp, "career");
  const careerId = isUuid(rawCareer) ? rawCareer : undefined;
  const [{ peers, total }, careers] = await Promise.all([listPeers({ careerId, page, pageSize: SIZE }), listActiveCareers()]);

  return (
    <>
      <PageHeader
        title="Find peers"
        description="Meet students your age who like the same careers. You only see first names and interests, and nobody can message you until you both agree to connect."
        actions={
          <Link href="/student/peers/connections" className={buttonVariants({ variant: "outline" })}>
            My connections
          </Link>
        }
      />
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          <FilterSelect param="career" label="All careers" options={careers.map((c) => ({ value: c.id, label: c.name }))} />
        </div>
        {peers.length === 0 ? (
          <EmptyState
            title={careerId ? "No students with this interest yet" : "No students to show yet"}
            description={careerId ? "Try another career, or clear the filter." : "Students in your age group who have finished sign-up will appear here. Add your career interests in your settings so we can match you."}
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {peers.map((p) => (
              <StudentCard key={p.id} peer={p} />
            ))}
          </div>
        )}
        <Pagination page={page} total={total} pageSize={SIZE} />
      </div>
    </>
  );
}
