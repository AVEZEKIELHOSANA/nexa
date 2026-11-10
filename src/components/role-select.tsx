import { Select } from "@/components/ui/input";

export type RoleOption = { id: string; name: string; access_level: string };

const LEVEL_LABEL: Record<string, string> = { student: "Student level", professional: "Professional level", admin: "Admin level" };

/**
 * RoleSelect: a role drop-down grouped by access level. Used by the invite / edit user dialogs.
 * It is a plain controlled <select> (works in forms and in server-action forms alike).
 */
export function RoleSelect({
  roles,
  value,
  onChange,
  id,
  name,
  disabled,
  required,
}: {
  roles: RoleOption[];
  value: string;
  onChange: (roleId: string) => void;
  id?: string;
  name?: string;
  disabled?: boolean;
  required?: boolean;
}) {
  const levels = ["student", "professional", "admin"];
  return (
    <Select id={id} name={name} value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled} required={required}>
      <option value="" disabled>
        Choose a role…
      </option>
      {levels.map((level) => {
        const inLevel = roles.filter((r) => r.access_level === level);
        if (inLevel.length === 0) return null;
        return (
          <optgroup key={level} label={LEVEL_LABEL[level]}>
            {inLevel.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </optgroup>
        );
      })}
    </Select>
  );
}
