import type { Metadata } from "next";
import { NotificationList } from "@/components/notification-list";
import { PageHeader } from "@/components/page-header";
import { UrlTabs } from "@/components/url-tabs";
import { requireAnyAccessLevel } from "@/lib/auth-guards";
import { listNotifications } from "@/lib/data/notifications";
import { PAGE_SIZE, oneOf, parsePage, type SearchParams } from "@/lib/pagination";

export const metadata: Metadata = { title: "Notifications" };

export default async function NotificationsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const me = await requireAnyAccessLevel("student", "professional");
  const filter = oneOf(sp, "filter", ["all", "unread"] as const) ?? "all";
  const page = parsePage(sp);
  const { notifications, total } = await listNotifications({ unreadOnly: filter === "unread", page, pageSize: PAGE_SIZE });

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <PageHeader title="Notifications" />
      <UrlTabs
        basePath="/notifications"
        param="filter"
        current={filter}
        tabs={[
          { value: "all", label: "All" },
          { value: "unread", label: "Unread" },
        ]}
      />
      <NotificationList notifications={notifications} level={me.accessLevel} total={total} page={page} pageSize={PAGE_SIZE} unreadOnly={filter === "unread"} />
    </div>
  );
}
