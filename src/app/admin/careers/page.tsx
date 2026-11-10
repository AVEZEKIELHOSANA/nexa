import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { listCareersAdmin } from "@/lib/data/admin-careers";
import { PAGE_SIZE, oneOf, param, parsePage, type SearchParams } from "@/lib/pagination";
import { CareersManager } from "./careers-manager";

export const metadata: Metadata = { title: "Careers" };

export default async function CareersAdminPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const page = parsePage(sp);
  const { careers, total } = await listCareersAdmin({
    search: param(sp, "q"),
    status: oneOf(sp, "status", ["active", "archived"] as const),
    page,
    pageSize: PAGE_SIZE,
  });
  return (
    <>
      <PageHeader
        title="Careers"
        description="The career fields students browse and professionals choose from. Archiving hides a career from sign-up and browsing; people who already have it keep it."
      />
      <CareersManager careers={careers} total={total} page={page} pageSize={PAGE_SIZE} />
    </>
  );
}
