/** Turns an admin_activity_log row into a sentence. Safe for client and server code. */
export const ACTIVITY_GROUPS = [
  { value: "user", label: "Users" },
  { value: "professional", label: "Verification" },
  { value: "role", label: "Roles" },
  { value: "career", label: "Careers" },
  { value: "course", label: "Courses" },
  { value: "slot", label: "Availability" },
  { value: "report", label: "Reports" },
  { value: "message", label: "Messages" },
  { value: "account", label: "Account deletions" },
] as const;

const s = (v: unknown): string | undefined => (typeof v === "string" && v ? v : undefined);

export function describeActivity(action: string, d: Record<string, unknown>): string {
  const name = s(d.name) ?? s(d.title);
  switch (action) {
    case "user.create": return `Invited ${name ?? "a user"}${s(d.role) ? ` as ${s(d.role)}` : ""}`;
    case "user.change_role": return `Changed the role of ${name ?? "a user"} from ${s(d.from) ?? "?"} to ${s(d.to) ?? "?"}`;
    case "user.activate": return `Activated ${name ?? "a user"}`;
    case "user.deactivate": return `Deactivated ${name ?? "a user"}`;
    case "user.rename": return `Renamed ${s(d.from) ?? "a user"} to ${s(d.to) ?? "?"}`;
    case "user.delete": return `Deleted ${name ?? "a user"}${s(d.mode) ? ` (${s(d.mode) === "hard" ? "removed completely" : "anonymised, records kept"})` : ""}`;
    case "user.reset_password": return `Sent a password reset to ${name ?? s(d.email) ?? "a user"}`;
    case "user.update_email": return `Changed the email of ${name ?? "a user"}`;
    case "professional.verify": return `Verified ${name ?? "a professional"}`;
    case "professional.reject": return `Rejected ${name ?? "a professional"}${s(d.reason) ? `: ${s(d.reason)}` : ""}`;
    case "role.create": return `Created the role "${name}"`;
    case "role.update": return `Updated the role "${name}"`;
    case "role.delete": return `Deleted the role "${name}"`;
    case "career.create": return `Added the career "${name}"`;
    case "career.update": return `Updated the career "${name}"`;
    case "career.archive": return `Archived the career "${name}"`;
    case "career.restore": return `Restored the career "${name}"`;
    case "course.create": return `Created the course "${name}"`;
    case "course.update": return `Edited the course "${name}"`;
    case "course.publish": return `Published the course "${name}"`;
    case "course.unpublish": return `Unpublished the course "${name}"`;
    case "course.delete": return `Deleted the course "${name}"`;
    case "slot.delete": return "Removed an availability slot";
    case "message.remove": return "Removed a message";
    case "report.resolve": return "Resolved a report";
    case "account.self_delete": return `A ${s(d.access_level) ?? "user"} deleted their own account${s(d.mode) === "hard" ? "" : " (records kept, anonymised)"}`;
    default: return action;
  }
}
