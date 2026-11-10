import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Briefcase } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { ReportConcernButton } from "@/components/report-concern-dialog";
import { Avatar } from "@/components/ui/avatar";
import { getPublicProfessional, listMyPendingSlotIds, listOpenSlots } from "@/lib/data/professionals";
import { isUuid } from "@/lib/pagination";
import { RequestSessionForm } from "./request-session-form";

export const metadata: Metadata = { title: "Professional" };

export default async function ProfessionalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) notFound();

  const professional = await getPublicProfessional(id);
  if (!professional) notFound(); // unknown, not verified, or deactivated: the view hides it

  const [slots, requestedSlotIds] = await Promise.all([listOpenSlots(id), listMyPendingSlotIds(id)]);

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <Link href={`/careers/${professional.careerId}`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> {professional.careerName}
      </Link>

      <header className="flex items-start gap-4">
        <Avatar name={professional.name} className="h-16 w-16 text-xl" />
        <div className="flex-1 space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">{professional.name}</h1>
          <p className="flex flex-wrap items-center gap-x-3 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Briefcase className="h-4 w-4" /> {professional.careerName}
            </span>
            {professional.experienceYears !== null && <span>{professional.experienceYears} years of experience</span>}
          </p>
        </div>
        <ReportConcernButton targetType="professional" targetId={professional.id} targetLabel={professional.name} />
      </header>

      <section aria-labelledby="about">
        <h2 id="about" className="mb-2 text-lg font-semibold">
          About
        </h2>
        <p className="whitespace-pre-line text-sm leading-relaxed">{professional.bio || "This professional has not written a bio yet."}</p>
      </section>

      <section aria-labelledby="availability">
        <h2 id="availability" className="mb-3 text-lg font-semibold">
          Available times
        </h2>
        {slots.length === 0 ? (
          <EmptyState title="No open slots right now" description="This professional has not published any upcoming availability. Check back later." />
        ) : (
          <RequestSessionForm professionalId={professional.id} professionalName={professional.name} slots={slots} requestedSlotIds={requestedSlotIds} />
        )}
      </section>
    </div>
  );
}
