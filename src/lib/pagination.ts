/** Default page size for lists. Every list query is paginated (Tech Spec section 5). */
export const PAGE_SIZE = 20;

export type SearchParams = Record<string, string | string[] | undefined>;

/** First value of a search param, trimmed, or undefined when empty. */
export function param(sp: SearchParams, key: string): string | undefined {
  const v = sp[key];
  const s = Array.isArray(v) ? v[0] : v;
  const t = s?.trim();
  return t ? t : undefined;
}

export function parsePage(sp: SearchParams): number {
  const n = Number.parseInt(param(sp, "page") ?? "1", 10);
  return Number.isFinite(n) && n > 0 ? Math.min(n, 10_000) : 1;
}

/** Value of a param only if it is one of the allowed values. */
export function oneOf<T extends string>(sp: SearchParams, key: string, allowed: readonly T[]): T | undefined {
  const v = param(sp, key);
  return v && (allowed as readonly string[]).includes(v) ? (v as T) : undefined;
}

/** Inclusive row range for supabase-js `.range(from, to)`. */
export function rangeFor(page: number, size: number = PAGE_SIZE): { from: number; to: number } {
  const from = (page - 1) * size;
  return { from, to: from + size - 1 };
}

export function totalPages(total: number, size: number = PAGE_SIZE): number {
  return Math.max(1, Math.ceil(total / size));
}

export function isUuid(v: string | undefined): v is string {
  return !!v && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
}
