import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { UrlTabs } from "@/components/url-tabs";
import { listActiveCareers } from "@/lib/data/careers";
import { countByStatus, listProfessionals, type VerificationStatus } from "@/lib/data/admin-verification";
import { PAGE_SIZE, oneOf, param, parsePage, type SearchParams } from "@/lib/pagination";
import { VerificationQueue } from "./verification-queue";

export const metadata: Metadata = { title: "Verification" };

export default async function VerificationPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const status: VerificationStatus = oneOf(sp, "status", ["pending", "verified", "rejected"] as const) ?? "pending";
  const page = parsePage(sp);

  const [{ professionals, total }, counts, careers] = await Promise.all([
    listProfessionals({ status, search: param(sp, "q"), careerId: param(sp, "career"), page, pageSize: PAGE_SIZE }),
    countByStatus(),
    listActiveCareers(),
  ]);

  return (
    <>
      <PageHeader
        title="Professional verification"
        description="Open each applicant's credentials, then approve or reject. Only verified professionals appear to students and can publish availability."
      />
      <div className="space-y-4">
        <UrlTabs
          basePath="/admin/verification"
          current={status}
          params={{ q: param(sp, "q"), career: param(sp, "career") }}
          tabs={[
            { value: "pending", label: "Pending", count: counts.pending },
            { value: "verified", label: "Verified", count: counts.verified },
            { value: "rejected", label: "Rejected", count: counts.rejected },
          ]}
        />
        <VerificationQueue professionals={professionals} total={total} page={page} pageSize={PAGE_SIZE} status={status} careers={careers} />
      </div>
    </>
  );
}
