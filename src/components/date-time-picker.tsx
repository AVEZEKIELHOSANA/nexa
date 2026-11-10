"use client";

import { Input } from "@/components/ui/input";
import { dayKey, timezoneLabel } from "@/lib/format";

export type DateTimeValue = { date: string; startTime: string; endTime: string };

/**
 * DateTimePicker: one day with a start and an end time. Built from the browser's native date and
 * time inputs (good mobile keyboards, no dependency). Everything is read in the platform time zone,
 * which is printed under the fields so nobody has to guess; the Server Action converts it to UTC.
 */
export function DateTimePicker({
  value,
  onChange,
  idPrefix = "slot",
  disabled,
}: {
  value: DateTimeValue;
  onChange: (next: DateTimeValue) => void;
  idPrefix?: string;
  disabled?: boolean;
}) {
  const today = dayKey(new Date());
  return (
    <fieldset className="space-y-2" disabled={disabled}>
      <legend className="sr-only">Date and time</legend>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1.5">
          <label htmlFor={`${idPrefix}-date`} className="text-sm font-medium">
            Date
          </label>
          <Input id={`${idPrefix}-date`} type="date" min={today} value={value.date} onChange={(e) => onChange({ ...value, date: e.target.value })} required />
        </div>
        <div className="space-y-1.5">
          <label htmlFor={`${idPrefix}-start`} className="text-sm font-medium">
            Start
          </label>
          <Input id={`${idPrefix}-start`} type="time" step={300} value={value.startTime} onChange={(e) => onChange({ ...value, startTime: e.target.value })} required />
        </div>
        <div className="space-y-1.5">
          <label htmlFor={`${idPrefix}-end`} className="text-sm font-medium">
            End
          </label>
          <Input id={`${idPrefix}-end`} type="time" step={300} value={value.endTime} onChange={(e) => onChange({ ...value, endTime: e.target.value })} required />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">Times are in {timezoneLabel()}.</p>
    </fieldset>
  );
}
