import Link from "next/link";
import { cn } from "@/lib/utils";

export type TabItem = { value: string; label: string; count?: number };

/**
 * Tabs driven by a URL parameter (?status=pending). Works in Server Components (plain links, no
 * hooks). `params` are the other search params to keep when switching tab; ?page is dropped.
 */
export function UrlTabs({
  basePath,
  param = "status",
  current,
  tabs,
  params = {},
}: {
  basePath: string;
  param?: string;
  current: string;
  tabs: TabItem[];
  params?: Record<string, string | undefined>;
}) {
  function hrefFor(value: string, isDefault: boolean) {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v && k !== param && k !== "page") q.set(k, v);
    if (!isDefault) q.set(param, value);
    const s = q.toString();
    return s ? `${basePath}?${s}` : basePath;
  }
  return (
    <div role="tablist" className="flex gap-1 overflow-x-auto border-b">
      {tabs.map((t, i) => {
        const active = t.value === current;
        return (
          <Link
            key={t.value}
            role="tab"
            aria-selected={active}
            href={hrefFor(t.value, i === 0)}
            className={cn(
              "-mb-px whitespace-nowrap border-b-2 px-4 py-2 text-sm font-medium",
              active ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {t.label}
            {t.count !== undefined && <span className="ml-1.5 rounded-full bg-muted px-1.5 text-xs">{t.count}</span>}
          </Link>
        );
      })}
    </div>
  );
}
