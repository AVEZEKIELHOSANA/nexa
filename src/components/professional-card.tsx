import Link from "next/link";
import { CalendarClock } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatDateTime } from "@/lib/format";
import type { PublicProfessional } from "@/lib/data/professionals";

/** ProfessionalCard: name, short bio, next open slot, "View profile". */
export function ProfessionalCard({ professional: p }: { professional: PublicProfessional }) {
  return (
    <Card className="h-full">
      <CardContent className="flex h-full flex-col gap-3 p-5">
        <div className="flex items-center gap-3">
          <Avatar name={p.name} className="h-11 w-11" />
          <div className="min-w-0">
            <p className="truncate font-semibold">{p.name}</p>
            <p className="truncate text-xs text-muted-foreground">
              {p.careerName}
              {p.experienceYears !== null && ` · ${p.experienceYears} yr experience`}
            </p>
          </div>
        </div>
        <p className="line-clamp-3 flex-1 text-sm text-muted-foreground">{p.bio || "This professional has not written a bio yet."}</p>
        <p className="flex items-center gap-1.5 text-xs">
          <CalendarClock className="h-3.5 w-3.5 text-muted-foreground" />
          {p.nextOpenSlot ? <>Next slot: {formatDateTime(p.nextOpenSlot)}</> : <span className="text-muted-foreground">No open slots right now</span>}
        </p>
        <Link href={`/professionals/${p.id}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
          View profile
        </Link>
      </CardContent>
    </Card>
  );
}
