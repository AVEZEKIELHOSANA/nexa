import { PLATFORM_TIMEZONE } from "@/lib/format";

const YMD = /^\d{4}-\d{2}-\d{2}$/;

export function isYmd(v: string | undefined): v is string {
  return !!v && YMD.test(v) && !Number.isNaN(Date.parse(`${v}T00:00:00Z`));
}

function offsetMs(at: Date, tz: string): number {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", { timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" })
      .formatToParts(at)
      .filter((x) => x.type !== "literal")
      .map((x) => [x.type, Number(x.value)])
  );
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - at.getTime();
}

/** The instant (ISO) at which the calendar day `ymd` starts in the platform time zone. */
export function dayStartIso(ymd: string): string {
  const guess = new Date(`${ymd}T00:00:00Z`);
  return new Date(guess.getTime() - offsetMs(guess, PLATFORM_TIMEZONE)).toISOString();
}

/** The instant at which the day AFTER `ymd` starts (an exclusive end bound). */
export function nextDayStartIso(ymd: string): string {
  const next = new Date(`${ymd}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  return dayStartIso(next.toISOString().slice(0, 10));
}
