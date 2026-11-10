import type { Metadata } from "next";
import Link from "next/link";
import { ConnectionActions } from "@/components/connection-actions";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Pagination } from "@/components/pagination";
import { ReportConcernButton } from "@/components/report-concern-dialog";
import { UrlTabs } from "@/components/url-tabs";
import { Avatar } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { countConnections, listConnections, type ConnectionTab } from "@/lib/data/peers";
import { formatDate } from "@/lib/format";
import { oneOf, parsePage, type SearchParams } from "@/lib/pagination";

export const metadata: Metadata = { title: "My connections" };

const SIZE = 20;
const TABS = ["received", "sent", "connected"] as const;

const EMPTY: Record<ConnectionTab, { title: string; text: string }> = {
  received: { title: "No requests waiting", text: "When another student asks to connect, you can accept or decline here." },
  sent: { title: "No requests sent", text: "Find students who share your interests and press Connect." },
  connected: { title: "No connections yet", text: "Students you accept, or who accept you, appear here." },
};

export default async function ConnectionsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const tab: ConnectionTab = oneOf(sp, "tab", TABS) ?? "received";
  const page = parsePage(sp);
  const [{ connections, total }, counts] = await Promise.all([listConnections(tab, { page, pageSize: SIZE }), countConnections()]);

  return (
    <>
      <PageHeader title="My connections" description="Requests you received, requests you sent, and the students you are connected with." actions={<Link href="/student/peers" className={buttonVariants({ variant: "outline" })}>Find peers</Link>} />
      <div className="space-y-5">
        <UrlTabs
          basePath="/student/peers/connections"
          param="tab"
          current={tab}
          tabs={[
            { value: "received", label: "Received", count: counts.received },
            { value: "sent", label: "Sent", count: counts.sent },
            { value: "connected", label: "Connected", count: counts.connected },
          ]}
        />
        {connections.length === 0 ? (
          <EmptyState title={EMPTY[tab].title} description={EMPTY[tab].text} />
        ) : (
          <ul className="divide-y rounded-lg border">
            {connections.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div className="flex items-center gap-3">
                  <Avatar name={c.otherFirstName} />
                  <div>
                    <p className="font-medium">{c.otherFirstName}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(c.createdAt)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {tab === "received" && <ConnectionActions connectionId={c.id} name={c.otherFirstName} />}
                  {tab === "sent" && <StatusBadge status="pending" />}
                  {tab === "connected" && (
                    <>
                      <StatusBadge status="connected" />
                      <ReportConcernButton targetType="student" targetId={c.otherId} targetLabel={c.otherFirstName} variant="icon" />
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
        <Pagination page={page} total={total} pageSize={SIZE} />
      </div>
    </>
  );
}
