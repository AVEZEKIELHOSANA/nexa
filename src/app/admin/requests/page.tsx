import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { listActiveCareers } from "@/lib/data/careers";
import { listAllRequests } from "@/lib/data/admin-requests";
import { PAGE_SIZE, isUuid, oneOf, param, parsePage, type SearchParams } from "@/lib/pagination";
import { RequestsTable } from "./requests-table";

export const metadata: Metadata = { title: "Requests" };

export default async function AdminRequestsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const page = parsePage(sp);
  const status = oneOf(sp, "status", ["pending", "accepted", "declined", "cancelled"] as const);
  const careerParam = param(sp, "career");
  const careerId = isUuid(careerParam) ? careerParam : undefined;

  const [{ requests, total }, careers] = await Promise.all([listAllRequests({ status, careerId, page, pageSize: PAGE_SIZE }), listActiveCareers()]);

  return (
    <>
      <PageHeader title="Mentorship requests" description="Every request on the platform, newest first. This is a read-only overview." />
      <RequestsTable requests={requests} total={total} page={page} pageSize={PAGE_SIZE} careers={careers} />
    </>
  );
}
