import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { UrlTabs } from "@/components/url-tabs";
import { requireAccessLevel } from "@/lib/auth";
import { countByStatus, listProfessionals, type VerificationStatus } from "@/lib/data/admin-verification";
import { listActiveCareers } from "@/lib/data/careers";
import { PAGE_SIZE, isUuid, oneOf, param, parsePage, type SearchParams } from "@/lib/pagination";
import { ProfessionalsManager } from "./professionals-manager";

export const metadata: Metadata = { title: "Professionals" };

export default async function AdminProfessionalsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const me = await requireAccessLevel("admin");
  const status = oneOf(sp, "status", ["pending", "verified", "rejected"] as const) as VerificationStatus | undefined;
  const page = parsePage(sp);
  const career = param(sp, "career");
  const [{ professionals, total }, counts, careers] = await Promise.all([
    listProfessionals({ status, search: param(sp, "q"), careerId: isUuid(career) ? career : undefined, page, pageSize: PAGE_SIZE }),
    countByStatus(),
    listActiveCareers(),
  ]);
  const all = counts.pending + counts.verified + counts.rejected;
  return (
    <>
      <PageHeader title="Professionals" description="Everyone who applied to mentor. Approve or reject applications in Verification; manage accounts here." />
      <div className="space-y-4">
        <UrlTabs
          basePath="/admin/professionals"
          current={status ?? "all"}
          params={{ q: param(sp, "q"), career }}
          tabs={[
            { value: "all", label: "All", count: all },
            { value: "pending", label: "Pending", count: counts.pending },
            { value: "verified", label: "Verified", count: counts.verified },
            { value: "rejected", label: "Rejected", count: counts.rejected },
          ]}
        />
        <ProfessionalsManager professionals={professionals} total={total} page={page} pageSize={PAGE_SIZE} careers={careers.map((c) => ({ id: c.id, name: c.name }))} currentUserId={me.id} />
      </div>
    </>
  );
}
