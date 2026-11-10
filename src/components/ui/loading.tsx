import { LoadingSkeleton, Skeleton } from "@/components/ui/skeleton";

/** Used by the loading.tsx files of each section: a title placeholder and a few rows. */
export function PageLoading({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-6" aria-busy="true">
      <div className="space-y-2">
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <LoadingSkeleton rows={rows} />
    </div>
  );
}
