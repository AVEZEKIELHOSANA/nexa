"use client";
import { Checkbox } from "@/components/ui/checkbox";

export function CareerInterestPicker({
  careers, selected, onToggle,
}: {
  careers: { id: string; name: string }[];
  selected: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {careers.map((c) => {
        const on = selected.includes(c.id);
        return (
          <label key={c.id} className="flex items-center gap-2 rounded-md border border-stone-200 px-3 py-2 text-sm cursor-pointer hover:bg-stone-50">
            {/* FIXED: Passing the ID correctly */}
            <Checkbox 
              checked={on} 
              onCheckedChange={() => onToggle(c.id)} 
            />
            <span>{c.name}</span>
          </label>
        );
      })}
      {/* Hidden inputs pass the state to the form action */}
      {selected.map((id) => (
        <input key={id} type="hidden" name="careerIds" value={id} />
      ))}
    </div>
  );
}