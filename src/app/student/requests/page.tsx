import type { Metadata } from "next";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Pagination } from "@/components/pagination";
import { RequestRow } from "@/components/request-row";
import { CancelSessionButton } from "@/components/cancel-session-button";
import { UrlTabs } from "@/components/url-tabs";
import { buttonVariants } from "@/components/ui/button";
import Link from "next/link";
import { requireAccessLevel } from "@/lib/auth";
import { REQUEST_STATUSES, countMyRequestsByStatus, listMyRequests, type RequestStatus } from "@/lib/data/requests";
import { PAGE_SIZE, oneOf, parsePage, type SearchParams } from "@/lib/pagination";

export const metadata: Metadata = { title: "My requests" };

const EMPTY: Record<RequestStatus, { title: string; description: string }> = {
  pending: { title: "No pending requests", description: "Requests you send wait here until the professional answers." },
  accepted: { title: "No accepted requests", description: "Accepted requests become sessions with a meeting link and a conversation." },
  declined: { title: "No declined requests", description: "If a professional cannot make a time, it shows up here with their reason." },
  cancelled: { title: "No cancelled requests", description: "Withdrawn requests and cancelled sessions are listed here." },
};

export default async function StudentRequestsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const me = await requireAccessLevel("student");
  const status: RequestStatus = oneOf(sp, "status", REQUEST_STATUSES) ?? "pending";
  const page = parsePage(sp);

  const [{ requests, total }, counts] = await Promise.all([
    listMyRequests(me.id, "student", { status, page, pageSize: PAGE_SIZE }),
    countMyRequestsByStatus(me.id, "student"),
  ]);

  return (
    <>
      <PageHeader
        title="My mentorship requests"
        description="Everything you asked for, and how the professionals answered."
        actions={
          <Link href="/careers" className={buttonVariants({ variant: "outline" })}>
            Browse careers
          </Link>
        }
      />
      <div className="space-y-4">
        <UrlTabs
          basePath="/student/requests"
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
            {requests.map((r) => (
              <li key={r.id}>
                <RequestRow
                  request={r}
                  href={`/student/requests/${r.id}`}
                  actions={
                    <>
                      <Link href={`/student/requests/${r.id}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
                        View
                      </Link>
                      {r.status === "pending" && <CancelSessionButton requestId={r.id} kind="withdraw" otherName={r.otherName} />}
                    </>
                  }
                />
              </li>
            ))}
          </ul>
        )}
        <Pagination page={page} total={total} pageSize={PAGE_SIZE} />
      </div>
    </>
  );
}
