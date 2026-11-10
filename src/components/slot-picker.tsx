"use client";

import { useMemo } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { dayKey, formatDayHeading, formatTimeRange } from "@/lib/format";

export type PickerSlot = { id: string; startTime: string; endTime: string };

/**
 * SlotPicker: open slots grouped by day, one button per slot. Controlled: the parent keeps the
 * selected id and renders the request form. `unavailableIds` are slots the student already requested.
 */
export function SlotPicker({
  slots,
  selectedId,
  onSelect,
  unavailableIds = [],
}: {
  slots: PickerSlot[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  unavailableIds?: string[];
}) {
  const groups = useMemo(() => {
    const map = new Map<string, PickerSlot[]>();
    for (const s of slots) {
      const key = dayKey(s.startTime);
      map.set(key, [...(map.get(key) ?? []), s]);
    }
    return [...map.entries()];
  }, [slots]);

  return (
    <div className="space-y-5">
      {groups.map(([key, daySlots]) => (
        <section key={key} aria-labelledby={`day-${key}`}>
          <h3 id={`day-${key}`} className="mb-2 text-sm font-medium">
            {formatDayHeading(daySlots[0].startTime)}
          </h3>
          <div className="flex flex-wrap gap-2">
            {daySlots.map((s) => {
              const requested = unavailableIds.includes(s.id);
              const selected = selectedId === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  disabled={requested}
                  aria-pressed={selected}
                  onClick={() => onSelect(s.id)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-md border px-3 py-2 text-sm transition-colors",
                    selected ? "border-primary bg-primary text-primary-foreground" : "bg-background hover:bg-accent",
                    requested && "cursor-not-allowed opacity-50 hover:bg-background"
                  )}
                >
                  {selected && <Check className="h-3.5 w-3.5" />}
                  {formatTimeRange(s.startTime, s.endTime)}
                  {requested && <span className="text-xs">(requested)</span>}
                </button>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
