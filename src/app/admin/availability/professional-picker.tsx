"use client";

import { Select } from "@/components/ui/input";
import { useUrlParams } from "@/components/use-url-params";

/** Drop-down of verified professionals; the choice is kept in the URL (?professional=<id>). */
export function ProfessionalPicker({ options }: { options: { id: string; name: string; careerName: string }[] }) {
  const { get, set } = useUrlParams();
  return (
    <div className="max-w-md space-y-1.5">
      <label htmlFor="pro-picker" className="text-sm font-medium">
        Professional
      </label>
      <Select id="pro-picker" value={get("professional")} onChange={(e) => set({ professional: e.target.value || null, status: null })}>
        <option value="">Choose a professional…</option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name} · {o.careerName}
          </option>
        ))}
      </Select>
    </div>
  );
}
