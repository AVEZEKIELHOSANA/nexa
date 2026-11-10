import type { Metadata } from "next";
import { DateRangeFilter } from "@/components/date-range-filter";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Pagination } from "@/components/pagination";
import { FilterSelect } from "@/components/table-filters";
import { Badge } from "@/components/ui/badge";
import { ACTIVITY_GROUPS, describeActivity } from "@/lib/activity";
import { listActivity } from "@/lib/data/activity-log";
import { listUsers } from "@/lib/data/admin-users";
import { dayStartIso, isYmd, nextDayStartIso } from "@/lib/day-range";
import { formatDateTime } from "@/lib/format";
import { isUuid, oneOf, param, parsePage, type SearchParams } from "@/lib/pagination";

export const metadata: Metadata = { title: "Activity log" };

const SIZE = 30;

export default async function ActivityLogPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const page = parsePage(sp);
  const group = oneOf(sp, "group", ACTIVITY_GROUPS.map((g) => g.value));
  const adminParam = param(sp, "admin");
  const from = param(sp, "from");
  const to = param(sp, "to");
  const [{ entries, total }, { users: admins }] = await Promise.all([
    listActivity({
      group,
      adminId: isUuid(adminParam) ? adminParam : undefined,
      from: isYmd(from) ? dayStartIso(from) : undefined,
      to: isYmd(to) ? nextDayStartIso(to) : undefined,
      page,
      pageSize: SIZE,
    }),
    listUsers({ accessLevel: "admin", pageSize: 100 }),
  ]);

  return (
    <>
      <PageHeader title="Activity log" description="Every change an administrator made to users, roles, careers, courses and reports. Entries cannot be edited or deleted." />
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <FilterSelect param="group" label="All activity" options={ACTIVITY_GROUPS.map((g) => ({ value: g.value, label: g.label }))} />
          <FilterSelect param="admin" label="All administrators" options={admins.map((a) => ({ value: a.id, label: a.name }))} />
          <DateRangeFilter />
        </div>
        {entries.length === 0 ? (
          <EmptyState title="No activity found" description="Nothing was recorded for these filters." />
        ) : (
          <ul className="divide-y rounded-lg border">
            {entries.map((e) => (
              <li key={e.id} className="flex flex-wrap items-start justify-between gap-2 px-4 py-3">
                <div className="min-w-0 space-y-1">
                  <p className="text-sm">{describeActivity(e.action, e.details)}</p>
                  <p className="text-xs text-muted-foreground">By {e.adminName ?? "the system / the person themselves"}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <Badge>{e.action}</Badge>
                  <time dateTime={e.createdAt} className="text-xs text-muted-foreground">{formatDateTime(e.createdAt)}</time>
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
