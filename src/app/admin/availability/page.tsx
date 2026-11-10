import type { Metadata } from "next";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { SlotManager } from "@/components/slot-manager";
import { UrlTabs } from "@/components/url-tabs";
import { countSlotsByStatus, listSlotsOf, listVerifiedProfessionalOptions, type SlotStatus } from "@/lib/data/availability";
import { PAGE_SIZE, isUuid, oneOf, param, parsePage, type SearchParams } from "@/lib/pagination";
import { addSlotForAction, adminEditSlotAction, adminRemoveSlotAction, slotImpactAction } from "./actions";
import { ProfessionalPicker } from "./professional-picker";

export const metadata: Metadata = { title: "Professional availability" };

export default async function AdminAvailabilityPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const options = await listVerifiedProfessionalOptions();
  const wanted = param(sp, "professional");
  const professionalId = isUuid(wanted) && options.some((o) => o.id === wanted) ? wanted : undefined;
  const status: SlotStatus = oneOf(sp, "status", ["open", "booked", "cancelled"] as const) ?? "open";
  const page = parsePage(sp);

  const [list, counts] = professionalId
    ? await Promise.all([listSlotsOf(professionalId, { status, page, pageSize: PAGE_SIZE }), countSlotsByStatus(professionalId)])
    : [null, null];

  return (
    <>
      <PageHeader
        title="Professional availability"
        description="Add, edit or delete slots on behalf of a verified professional. Deleting a booked slot cancels the session and notifies both people."
      />
      <div className="space-y-5">
        <ProfessionalPicker options={options} />

        {!professionalId || !list || !counts ? (
          <EmptyState title="Choose a professional" description="Their slots appear here." />
        ) : (
          <div className="space-y-4">
            <UrlTabs
              basePath="/admin/availability"
              current={status}
              params={{ professional: professionalId }}
              tabs={[
                { value: "open", label: "Open", count: counts.open },
                { value: "booked", label: "Booked", count: counts.booked },
                { value: "cancelled", label: "Cancelled", count: counts.cancelled },
              ]}
            />
            <SlotManager
              slots={list.slots}
              total={list.total}
              page={page}
              pageSize={PAGE_SIZE}
              mode="admin"
              canAdd
              emptyText={`No ${status} slots.`}
              actions={{
                create: addSlotForAction.bind(null, professionalId),
                update: adminEditSlotAction,
                remove: adminRemoveSlotAction,
                impact: slotImpactAction,
              }}
            />
          </div>
        )}
      </div>
    </>
  );
}
