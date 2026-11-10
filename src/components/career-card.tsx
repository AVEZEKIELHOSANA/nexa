import Link from "next/link";
import { Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DirectoryCareer } from "@/lib/data/career-directory";

/** CareerCard: name, short description, number of verified professionals. The whole card is a link. */
export function CareerCard({ career }: { career: DirectoryCareer }) {
  return (
    <Link href={`/student/careers/${career.id}`} className="group block h-full rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      <Card className="h-full transition-colors group-hover:border-primary">
        <CardHeader>
          <CardTitle>{career.name}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="line-clamp-3 text-sm text-muted-foreground">{career.description || "Talk to professionals working in this field."}</p>
          <p className="inline-flex items-center gap-1.5 text-xs font-medium text-primary">
            <Users className="h-3.5 w-3.5" />
            {career.professionalCount === 0 ? "No professionals yet" : `${career.professionalCount} professional${career.professionalCount === 1 ? "" : "s"}`}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}
