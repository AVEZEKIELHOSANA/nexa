/**
 * Date and time helpers. Everything on the platform is shown in ONE time zone so a slot reads the
 * same for the mentor, the student and the admin, on the server and in the browser (no hydration
 * mismatch). Default: Africa/Douala (UTC+1, no daylight saving). Change it with
 * NEXT_PUBLIC_TIMEZONE in .env.local / Vercel if the pilot moves.
 */
export const PLATFORM_TIMEZONE = process.env.NEXT_PUBLIC_TIMEZONE || "Africa/Douala";

const LOCALE = "en-GB";

function fmt(options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat(LOCALE, { timeZone: PLATFORM_TIMEZONE, ...options });
}

const toDate = (iso: string | Date) => (iso instanceof Date ? iso : new Date(iso));

/** "Wed 28 Oct 2026, 14:30" */
export function formatDateTime(iso: string | Date | null | undefined): string {
  if (!iso) return "—";
  return fmt({ weekday: "short", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(toDate(iso));
}

/** "28 Oct 2026" */
export function formatDate(iso: string | Date | null | undefined): string {
  if (!iso) return "—";
  return fmt({ day: "numeric", month: "short", year: "numeric" }).format(toDate(iso));
}

/** "14:30" */
export function formatTime(iso: string | Date | null | undefined): string {
  if (!iso) return "—";
  return fmt({ hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(toDate(iso));
}

/** "14:30 – 15:30" */
export function formatTimeRange(start: string | Date, end: string | Date): string {
  return `${formatTime(start)} – ${formatTime(end)}`;
}

/** "Wednesday 28 October" (group headings) */
export function formatDayHeading(iso: string | Date): string {
  return fmt({ weekday: "long", day: "numeric", month: "long" }).format(toDate(iso));
}

/** "2026-10-28": the calendar day in the platform time zone, for grouping. */
export function dayKey(iso: string | Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: PLATFORM_TIMEZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(toDate(iso));
}

/** "5 min ago", "3 h ago", "2 d ago", then the date. */
export function relativeTime(iso: string | Date, now: number = Date.now()): string {
  const diff = Math.max(0, now - toDate(iso).getTime());
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "just now";
  if (min < 60) return `${min} min ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d} d ago`;
  return formatDate(iso);
}

/** "GMT+1": shown next to date pickers so nobody has to guess. */
export function timezoneLabel(): string {
  const part = fmt({ timeZoneName: "short" }).formatToParts(new Date()).find((p) => p.type === "timeZoneName");
  return `${PLATFORM_TIMEZONE.replace("_", " ")} (${part?.value ?? ""})`;
}

// ---- converting what people type (date + time in the platform time zone) to UTC and back ----

function offsetMs(utcMs: number): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: PLATFORM_TIMEZONE, hourCycle: "h23",
    year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit",
  }).formatToParts(new Date(utcMs));
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return asUtc - Math.floor(utcMs / 1000) * 1000;
}

/** "2026-10-28" + "14:30" (platform time zone) -> ISO string in UTC. Returns null if invalid. */
export function zonedToUtcIso(date: string, time: string): string | null {
  const d = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  const t = /^(\d{2}):(\d{2})$/.exec(time);
  if (!d || !t) return null;
  const naive = Date.UTC(+d[1], +d[2] - 1, +d[3], +t[1], +t[2]);
  let utc = naive - offsetMs(naive);
  utc = naive - offsetMs(utc); // second pass handles the day a daylight-saving change happens
  const result = new Date(utc);
  return Number.isNaN(result.getTime()) ? null : result.toISOString();
}

/** UTC ISO string -> { date: "2026-10-28", time: "14:30" } in the platform time zone (to prefill a form). */
export function utcToZonedParts(iso: string): { date: string; time: string } {
  return {
    date: dayKey(iso),
    time: new Intl.DateTimeFormat("en-GB", { timeZone: PLATFORM_TIMEZONE, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(iso)),
  };
}
