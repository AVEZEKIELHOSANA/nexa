import type { Metadata } from "next";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Pagination } from "@/components/pagination";
import { RequestActions } from "@/components/request-actions";
import { RequestRow } from "@/components/request-row";
import { UrlTabs } from "@/components/url-tabs";
import { requireAccessLevel } from "@/lib/auth";
import { REQUEST_STATUSES, countMyRequestsByStatus, listMyRequests, type RequestStatus } from "@/lib/data/requests";
import { PAGE_SIZE, oneOf, parsePage, type SearchParams } from "@/lib/pagination";
import { buttonVariants } from "@/components/ui/button";
import Link from "next/link";

export const metadata: Metadata = { title: "Requests" };

const EMPTY: Record<RequestStatus, { title: string; description: string }> = {
  pending: { title: "No requests waiting", description: "When a student asks for one of your open slots, it appears here and in your notifications." },
  accepted: { title: "No accepted requests", description: "Requests you accept are listed here." },
  declined: { title: "No declined requests", description: "Requests you declined, or that were taken by another student, are listed here." },
  cancelled: { title: "No cancelled requests", description: "Withdrawn requests and cancelled sessions are listed here." },
};

export default async function ProfessionalRequestsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const me = await requireAccessLevel("professional");
  const status: RequestStatus = oneOf(sp, "status", REQUEST_STATUSES) ?? "pending";
  const page = parsePage(sp);

  const [{ requests, total }, counts] = await Promise.all([
    listMyRequests(me.id, "professional", { status, page, pageSize: PAGE_SIZE }),
    countMyRequestsByStatus(me.id, "professional"),
  ]);

  return (
    <>
      <PageHeader title="Mentorship requests" description="Students who asked for one of your open times." />
      <div className="space-y-4">
        <UrlTabs
          basePath="/pro/requests"
          current={status}
          tabs={[
            { value: "pending", label: "Pending", count: counts.pending },
            { value: "accepted", label: "Accepted", count: counts.accepted },
            { value: "declined", label: "Declined", count: counts.declined },
            { value: "cancelled", label: "Cancelled", count: counts.cancelled },
          ]}
        />
        {requests.length === 0 ? (
          <EmptyState {...EMPTY[status]} />
        ) : (
          <ul className="space-y-3">
            {requests.map((r) => {
              const stillFuture = new Date(r.slot.startTime) > new Date();
              return (
                <li key={r.id}>
                  <RequestRow
                    request={r}
                    showMessage
                    actions={
                      r.status === "pending" && stillFuture ? (
                        <RequestActions requestId={r.id} studentName={r.otherName} />
                      ) : r.status === "accepted" ? (
                        <Link href={`/messages/${r.id}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
                          Open conversation
                        </Link>
                      ) : r.status === "pending" ? (
                        <span className="text-xs text-muted-foreground">This time has passed</span>
                      ) : undefined
                    }
                  />
                </li>
              );
            })}
          </ul>
        )}
        <Pagination page={page} total={total} pageSize={PAGE_SIZE} />
      </div>
    </>
  );
}
