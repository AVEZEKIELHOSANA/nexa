import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/** StatCard: one big number with a label, optionally a link. Used on every dashboard. */
export function StatCard({ label, value, icon: Icon, href, hint, highlight = false }: { label: string; value: number | string; icon?: LucideIcon; href?: string; hint?: string; highlight?: boolean }) {
  const body = (
    <Card className={cn("h-full p-4 transition-colors", href && "hover:border-primary", highlight && "border-primary/60 bg-primary/5")}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">{label}</p>
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" aria-hidden />}
      </div>
      <p className="mt-2 text-3xl font-semibold tabular-nums">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </Card>
  );
  return href ? (
    <Link href={href} className="block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      {body}
    </Link>
  ) : (
    body
  );
}
