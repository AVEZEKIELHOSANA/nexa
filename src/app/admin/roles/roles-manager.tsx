"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { DataTable, type Column } from "@/components/data-table";
import { RowMenu } from "@/components/row-menu";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { ConfirmDialog, Modal, ModalActions } from "@/components/ui/modal";
import type { AccessLevelName, RoleRow } from "@/lib/data/admin-roles";
import { createRoleAction, deleteRoleAction, updateRoleAction } from "./actions";

const LEVEL_LABEL: Record<AccessLevelName, string> = { student: "Student", professional: "Professional", admin: "Admin" };

export function RolesManager({ roles }: { roles: RoleRow[] }) {
  const [editing, setEditing] = useState<RoleRow | "new" | null>(null);
  const [deleting, setDeleting] = useState<RoleRow | null>(null);

  const columns: Column<RoleRow>[] = [
    {
      key: "name",
      header: "Role",
      cell: (r) => (
        <div>
          <p className="font-medium">
            {r.name} {r.isSystem && <Badge className="ml-1">Built-in</Badge>}
          </p>
          {r.description && <p className="text-xs text-muted-foreground">{r.description}</p>}
        </div>
      ),
    },
    { key: "level", header: "Access level", cell: (r) => <Badge tone={r.accessLevel === "admin" ? "info" : "neutral"}>{LEVEL_LABEL[r.accessLevel]}</Badge> },
    { key: "users", header: "Users", cell: (r) => r.userCount },
    {
      key: "actions",
      header: "",
      className: "text-right",
      cell: (r) =>
        r.isSystem ? (
          <span className="text-xs text-muted-foreground">Protected</span>
        ) : (
          <div className="flex items-center justify-end gap-1">
            <Button size="sm" variant="outline" onClick={() => setEditing(r)}>
              Edit
            </Button>
            <RowMenu items={[{ label: r.userCount > 0 ? "Delete (in use)" : "Delete…", onSelect: () => setDeleting(r), destructive: true }]} />
          </div>
        ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setEditing("new")}>
          <Plus className="h-4 w-4" /> New role
        </Button>
      </div>

      <DataTable columns={columns} rows={roles} rowKey={(r) => r.id} total={roles.length} page={1} pageSize={roles.length || 1} hidePagination caption="Roles" />

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing === "new" ? "New role" : "Edit role"}>
        {editing && <RoleForm key={editing === "new" ? "new" : editing.id} role={editing === "new" ? null : editing} onClose={() => setEditing(null)} />}
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        title="Delete this role?"
        description={
          deleting && deleting.userCount > 0
            ? `${deleting.userCount} user(s) still hold "${deleting.name}". Move them to another role first; the database will refuse the deletion.`
            : `"${deleting?.name}" will be removed. This cannot be undone.`
        }
        confirmLabel="Delete role"
        destructive
        onConfirm={async () => {
          const r = await deleteRoleAction(deleting!.id);
          if (!r.ok) {
            toast.error(r.error);
            return false;
          }
          toast.success("Role deleted");
        }}
      />
    </div>
  );
}

function RoleForm({ role, onClose }: { role: RoleRow | null; onClose: () => void }) {
  const [name, setName] = useState(role?.name ?? "");
  const [description, setDescription] = useState(role?.description ?? "");
  const [level, setLevel] = useState<string>(role?.accessLevel ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const levelLocked = !!role && role.userCount > 0;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const r = role
      ? await updateRoleAction({ id: role.id, name, description, accessLevel: levelLocked ? undefined : level })
      : await createRoleAction({ name, description, accessLevel: level });
    setBusy(false);
    if (!r.ok) return setError(r.error);
    toast.success(role ? "Role updated" : "Role created");
    onClose();
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Role name" htmlFor="role-name">
        <Input id="role-name" value={name} onChange={(e) => setName(e.target.value)} required minLength={2} maxLength={50} />
      </Field>
      <Field label="Description" htmlFor="role-desc" hint="Optional. Shown to admins only.">
        <Textarea id="role-desc" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={300} rows={3} />
      </Field>
      <Field
        label="Access level"
        htmlFor="role-level"
        hint={levelLocked ? "Locked while users hold this role." : "Decides which part of Nexa people with this role can open."}
      >
        <Select id="role-level" value={level} onChange={(e) => setLevel(e.target.value)} required disabled={levelLocked}>
          <option value="" disabled>
            Choose…
          </option>
          <option value="student">Student</option>
          <option value="professional">Professional</option>
          <option value="admin">Admin</option>
        </Select>
      </Field>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <ModalActions>
        <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        <Button type="submit" disabled={busy || !level}>
          {busy ? "Saving…" : "Save role"}
        </Button>
      </ModalActions>
    </form>
  );
}
