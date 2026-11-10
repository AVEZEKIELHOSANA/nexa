"use client";

import { useCallback, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/**
 * Filters, search, sorting and the page number live in the URL (?q=...&page=2), so lists can be
 * bookmarked, survive a refresh and are read by the Server Component that fetches the data.
 *
 *   const { get, set, pending } = useUrlParams();
 *   set({ role: "abc" })        // changes ?role and resets ?page
 *   set({ page: "3" }, false)   // changes ?page only
 */
export function useUrlParams() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const get = useCallback((key: string) => searchParams.get(key) ?? "", [searchParams]);

  const set = useCallback(
    (updates: Record<string, string | null | undefined>, resetPage = true) => {
      const next = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === undefined || value === "") next.delete(key);
        else next.set(key, value);
      }
      if (resetPage && !("page" in updates)) next.delete("page");
      const query = next.toString();
      startTransition(() => router.push(query ? `${pathname}?${query}` : pathname));
    },
    [router, pathname, searchParams]
  );

  return { get, set, pending };
}
