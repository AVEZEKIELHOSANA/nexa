import { zonedToUtcIso } from "@/lib/format";

export const MIN_SLOT_MINUTES = 15;
export const MAX_SLOT_MINUTES = 240;

export type SlotFormValues = { date: string; startTime: string; endTime: string; meetingUrl: string };

/**
 * Turns what a person typed (date and times in the platform time zone) into UTC timestamps and
 * checks the rules the database also enforces (the database is the real guard; this gives friendly
 * messages first). Throws an Error with a message for people.
 */
export function parseSlotInput(v: SlotFormValues): { startTime: string; endTime: string; meetingUrl: string | null } {
  const startTime = zonedToUtcIso(v.date, v.startTime);
  const endTime = zonedToUtcIso(v.date, v.endTime);
  if (!startTime || !endTime) throw new Error("Choose a date, a start time and an end time.");
  const minutes = (new Date(endTime).getTime() - new Date(startTime).getTime()) / 60_000;
  if (minutes <= 0) throw new Error("The end time must be after the start time.");
  if (minutes < MIN_SLOT_MINUTES) throw new Error(`A session is at least ${MIN_SLOT_MINUTES} minutes long.`);
  if (minutes > MAX_SLOT_MINUTES) throw new Error(`A session is at most ${MAX_SLOT_MINUTES / 60} hours long.`);
  if (new Date(startTime).getTime() <= Date.now()) throw new Error("The slot must start in the future.");
  const meetingUrl = parseMeetingUrl(v.meetingUrl);
  return { startTime, endTime, meetingUrl };
}

export function parseMeetingUrl(raw: string): string | null {
  const url = raw.trim();
  if (!url) return null;
  if (url.length > 500 || !/^https?:\/\/[^\s]+$/i.test(url)) throw new Error("The meeting link must be a web address starting with http:// or https://");
  return url;
}
