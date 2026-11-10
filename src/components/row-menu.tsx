"use client";

import { MoreHorizontal } from "lucide-react";

/** Small "..." menu built on <details>, so it needs no extra library. */
export function RowMenu({
  items,
  disabled,
}: {
  items: { label: string; onSelect: () => void; destructive?: boolean }[];
  disabled?: boolean;
}) {
  return (
    <details className="relative">
      <summary
        aria-label="More actions"
        className={`flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-md hover:bg-accent ${disabled ? "pointer-events-none opacity-40" : ""}`}
      >
        <MoreHorizontal className="h-4 w-4" />
      </summary>
      <div className="absolute right-0 z-20 mt-1 w-48 rounded-md border bg-card p-1 text-left shadow-md">
        {items.map((item) => (
          <button
            key={item.label}
            type="button"
            className={`block w-full rounded px-3 py-2 text-left text-sm hover:bg-accent ${item.destructive ? "text-destructive" : ""}`}
            onClick={(e) => {
              (e.currentTarget.closest("details") as HTMLDetailsElement | null)?.removeAttribute("open");
              item.onSelect();
            }}
          >
            {item.label}
          </button>
        ))}
      </div>
    </details>
  );
}
