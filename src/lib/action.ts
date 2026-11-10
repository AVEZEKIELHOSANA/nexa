/**
 * Result type returned by every Server Action, so client components can show a toast
 * without try/catch: `const r = await someAction(...); if (!r.ok) toast.error(r.error)`.
 */
export type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

export function ok(): ActionResult;
export function ok<T>(data: T): ActionResult<T>;
export function ok<T>(data?: T): ActionResult<T | undefined> {
  return { ok: true, data };
}

export function fail(error: unknown): { ok: false; error: string } {
  return { ok: false, error: errorMessage(error) };
}

type DbErrorLike = { message?: string; code?: string };

// SQLSTATE codes our own database functions raise on purpose, with messages written for people.
const FRIENDLY_CODES = new Set(["P0001", "P0002", "22023", "23514", "23505"]);

/**
 * Turns whatever was thrown (Error, Supabase/Postgres error object, string) into a message that is
 * safe to show. Messages raised deliberately by our SQL functions pass through; raw database
 * errors (permission denied, constraint names...) are replaced by plain sentences.
 */
export function errorMessage(error: unknown): string {
  if (typeof error === "string") return error;
  const e = (error ?? {}) as DbErrorLike;
  const message = typeof e.message === "string" ? e.message : "";

  if (e.code === "23P01") return "This time overlaps another slot of yours.";
  if (e.code === "23503") return "This item is still used elsewhere and cannot be removed.";
  if (/row-level security|permission denied/i.test(message)) return "You are not allowed to do this.";
  if (e.code === "42501" && message) return message;
  if (e.code && FRIENDLY_CODES.has(e.code) && message) return message;
  if (!e.code && message) return message; // plain Error thrown by our own code
  return "Something went wrong. Please try again.";
}
