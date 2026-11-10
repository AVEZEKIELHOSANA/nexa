import type { Metadata } from "next";
import { CircleAlert } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { SlotManager } from "@/components/slot-manager";
import { UrlTabs } from "@/components/url-tabs";
import { requireAccessLevel } from "@/lib/auth";
import { countSlotsByStatus, listSlotsOf, type SlotStatus } from "@/lib/data/availability";
import { getMyProfessionalStatus } from "@/lib/data/professional-self";
import { PAGE_SIZE, oneOf, parsePage, type SearchParams } from "@/lib/pagination";
import { addSlotAction, editSlotAction, removeSlotAction } from "./actions";

export const metadata: Metadata = { title: "My availability" };

const EMPTY: Record<SlotStatus, string> = {
  open: "You have no upcoming open slots. Add one so students can request a session.",
  booked: "No upcoming booked sessions yet.",
  cancelled: "No cancelled slots.",
};

export default async function MyAvailabilityPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const me = await requireAccessLevel("professional");
  const status: SlotStatus = oneOf(sp, "status", ["open", "booked", "cancelled"] as const) ?? "open";
  const page = parsePage(sp);

  const [mine, { slots, total }, counts] = await Promise.all([
    getMyProfessionalStatus(me.id),
    listSlotsOf(me.id, { status, page, pageSize: PAGE_SIZE }),
    countSlotsByStatus(me.id),
  ]);
  const verified = mine?.status === "verified";

  return (
    <>
      <PageHeader title="My availability" description="Times when students can request a session with you. A student's request must be accepted by you before a slot is booked." />

      {!verified && (
        <div role="status" className="mb-5 flex gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
          <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            {mine?.status === "rejected"
              ? "Your application was not approved, so you cannot add slots yet. Upload new credentials in your profile settings to apply again."
              : "Your application is waiting for verification. You can add slots as soon as an administrator approves it."}
          </p>
        </div>
      )}

      <div className="space-y-4">
        <UrlTabs
          basePath="/pro/availability"
          current={status}
          tabs={[
            { value: "open", label: "Open", count: counts.open },
            { value: "booked", label: "Booked", count: counts.booked },
            { value: "cancelled", label: "Cancelled", count: counts.cancelled },
          ]}
        />
        <SlotManager
          slots={slots}
          total={total}
          page={page}
          pageSize={PAGE_SIZE}
          mode="professional"
          canAdd={verified}
          emptyText={EMPTY[status]}
          actions={{ create: addSlotAction, update: editSlotAction, remove: removeSlotAction }}
        />
      </div>
    </>
  );
}
