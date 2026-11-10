import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Pagination } from "@/components/pagination";
import { ProfessionalCard } from "@/components/professional-card";
import { getDirectoryCareer } from "@/lib/data/career-directory";
import { listProfessionalsByCareer } from "@/lib/data/professionals";
import { isUuid, parsePage, type SearchParams } from "@/lib/pagination";

export const metadata: Metadata = { title: "Career" };

const SIZE = 12;

export default async function CareerDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<SearchParams> }) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  if (!isUuid(id)) notFound();
  const page = parsePage(sp);

  const [career, { professionals, total }] = await Promise.all([getDirectoryCareer(id), listProfessionalsByCareer(id, { page, pageSize: SIZE })]);
  if (!career) notFound();

  return (
    <>
      <Link href="/student/careers" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> All careers
      </Link>
      <PageHeader title={career.name} description={career.description ?? undefined} />
      <h2 className="mb-3 text-lg font-semibold">Professionals in {career.name}</h2>
      {professionals.length === 0 ? (
        <EmptyState title="No verified professionals yet" description="Check back soon, or browse another career." />
      ) : (
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {professionals.map((p) => (
              <ProfessionalCard key={p.id} professional={p} />
            ))}
          </div>
          <Pagination page={page} total={total} pageSize={SIZE} />
        </div>
      )}
    </>
  );
}
