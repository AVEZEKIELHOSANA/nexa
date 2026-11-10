"use client";

import { Input } from "@/components/ui/input";
import { useUrlParams } from "@/components/use-url-params";

/** From / To date pickers that write ?from= and ?to= (YYYY-MM-DD) to the URL. */
export function DateRangeFilter() {
  const { get, set } = useUrlParams();
  return (
    <div className="flex items-center gap-2 text-sm">
      <label className="sr-only" htmlFor="df-from">From</label>
      <Input id="df-from" type="date" value={get("from")} max={get("to") || undefined} onChange={(e) => set({ from: e.target.value || null })} className="w-auto" />
      <span aria-hidden className="text-muted-foreground">to</span>
      <label className="sr-only" htmlFor="df-to">To</label>
      <Input id="df-to" type="date" value={get("to")} min={get("from") || undefined} onChange={(e) => set({ to: e.target.value || null })} className="w-auto" />
    </div>
  );
}
