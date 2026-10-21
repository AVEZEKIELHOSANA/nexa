import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", {
  variants: {
    tone: {
      neutral: "bg-secondary text-secondary-foreground",
      success: "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200",
      warning: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
      danger: "bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-200",
      info: "bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-200",
    },
  },
  defaultVariants: { tone: "neutral" },
});

export function Badge({
  className,
  tone,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}

const STATUS_TONE: Record<string, VariantProps<typeof badgeVariants>["tone"]> = {
  pending: "warning",
  accepted: "success",
  declined: "danger",
  cancelled: "neutral",
  open: "info",
  booked: "success",
  verified: "success",
  rejected: "danger",
  resolved: "success",
  connected: "success",
};

/** StatusBadge: one place that decides the colour of every status in the app. */
export function StatusBadge({ status }: { status: string }) {
  return <Badge tone={STATUS_TONE[status] ?? "neutral"}>{status.charAt(0).toUpperCase() + status.slice(1)}</Badge>;
}
