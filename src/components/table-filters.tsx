"use client";

import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { Input, Select } from "@/components/ui/input";
import { useUrlParams } from "@/components/use-url-params";

/** Search box that writes ?q= to the URL after a short pause in typing. */
export function SearchBox({ placeholder = "Search…", param = "q" }: { placeholder?: string; param?: string }) {
  const { get, set } = useUrlParams();
  const current = get(param);
  const [value, setValue] = useState(current);

  // keep the box in step when the URL changes from elsewhere (back button, "clear filters")
  useEffect(() => setValue(current), [current]);

  useEffect(() => {
    if (value === current) return;
    const t = setTimeout(() => set({ [param]: value.trim() || null }), 350);
    return () => clearTimeout(t);
  }, [value, current, param, set]);

  return (
    <div className="relative min-w-52 flex-1 sm:max-w-xs">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="pl-9"
      />
    </div>
  );
}

/** Drop-down filter that writes its value to the URL. The first option is the "all" choice (value ""). */
export function FilterSelect({
  param,
  label,
  options,
  className,
}: {
  param: string;
  label: string;
  options: { value: string; label: string }[];
  className?: string;
}) {
  const { get, set } = useUrlParams();
  return (
    <Select aria-label={label} value={get(param)} onChange={(e) => set({ [param]: e.target.value || null })} className={className ?? "w-auto min-w-40"}>
      <option value="">{label}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </Select>
  );
}
