import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { UrlTabs } from "@/components/url-tabs";
import { countOpenReports, getReport, getReportContext, listReports } from "@/lib/data/reports";
import { PAGE_SIZE, isUuid, oneOf, param, parsePage, type SearchParams } from "@/lib/pagination";
import { ReportDetail } from "./report-detail";
import { ReportsTable } from "./reports-table";

export const metadata: Metadata = { title: "Reports" };

export default async function AdminReportsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const status = oneOf(sp, "status", ["open", "resolved", "all"] as const) ?? "open";
  const page = parsePage(sp);
  const selectedId = isUuid(param(sp, "report")) ? param(sp, "report") : undefined;

  const [{ reports, total }, openCount, selected] = await Promise.all([
    listReports({ status: status === "all" ? undefined : status, page, pageSize: PAGE_SIZE }),
    countOpenReports(),
    selectedId ? getReport(selectedId) : Promise.resolve(null),
  ]);
  const context = selected ? await getReportContext(selected) : null;

  return (
    <>
      <PageHeader title="Reports" description="Concerns filed by students and professionals. Read the conversation, remove a message if needed, then resolve the report with notes." />
      <div className="space-y-6">
        {selected && context && <ReportDetail key={selected.id} report={selected} context={context} />}
        <div className="space-y-4">
          <UrlTabs
            basePath="/admin/reports"
            current={status}
            params={{}}
            tabs={[
              { value: "open", label: "Open", count: openCount },
              { value: "resolved", label: "Resolved" },
              { value: "all", label: "All" },
            ]}
          />
          <ReportsTable reports={reports} total={total} page={page} pageSize={PAGE_SIZE} status={status} selectedId={selected?.id} />
        </div>
      </div>
    </>
  );
}
