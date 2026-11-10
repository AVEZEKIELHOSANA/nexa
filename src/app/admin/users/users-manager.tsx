"use client";

import { useState } from "react";
import { UserPlus } from "lucide-react";
import { toast } from "sonner";
import { DataTable, type Column } from "@/components/data-table";
import { EmptyState } from "@/components/empty-state";
import { RoleSelect, type RoleOption } from "@/components/role-select";
import { RowMenu } from "@/components/row-menu";
import { FilterSelect, SearchBox } from "@/components/table-filters";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/input";
import { ConfirmDialog, Modal, ModalActions } from "@/components/ui/modal";
import type { AdminUser } from "@/lib/data/admin-users";
import { formatDate } from "@/lib/format";
import { deleteUserAction, createUserAction, resetPasswordAction, setUserActiveAction, updateUserAction } from "./actions";

type Career = { id: string; name: string };

export function UsersManager({
  users,
  total,
  page,
  pageSize,
  sort,
  dir,
  roles,
  careers,
  currentUserId,
}: {
  users: AdminUser[];
  total: number;
  page: number;
  pageSize: number;
  sort: string;
  dir: "asc" | "desc";
  roles: RoleOption[];
  careers: Career[];
  currentUserId: string;
}) {
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<AdminUser | null>(null);
  const [deleting, setDeleting] = useState<AdminUser | null>(null);
  const [resetting, setResetting] = useState<AdminUser | null>(null);
  const [toggling, setToggling] = useState<AdminUser | null>(null);

  const columns: Column<AdminUser>[] = [
    {
      key: "name",
      header: "Name",
      sortKey: "name",
      cell: (u) => (
        <div className="flex items-center gap-3">
          <Avatar name={u.name} />
          <div className="min-w-0">
            <p className="truncate font-medium">{u.name}</p>
            <p className="truncate text-xs text-muted-foreground">{u.email ?? "no email"}</p>
          </div>
        </div>
      ),
    },
    { key: "role", header: "Role", sortKey: "role", cell: (u) => <Badge tone={u.accessLevel === "admin" ? "info" : "neutral"}>{u.roleName}</Badge> },
    {
      key: "status",
      header: "Status",
      cell: (u) =>
        u.deletedAt ? (
          <Badge tone="danger">Deleted</Badge>
        ) : !u.isActive ? (
          <Badge tone="warning">Inactive</Badge>
        ) : !u.emailConfirmed ? (
          <Badge tone="info">Invite pending</Badge>
        ) : (
          <Badge tone="success">Active</Badge>
        ),
    },
    { key: "created", header: "Joined", sortKey: "created_at", cell: (u) => <span className="whitespace-nowrap text-muted-foreground">{formatDate(u.createdAt)}</span> },
    { key: "last", header: "Last sign-in", cell: (u) => <span className="whitespace-nowrap text-muted-foreground">{u.lastSignInAt ? formatDate(u.lastSignInAt) : "Never"}</span> },
    {
      key: "actions",
      header: "",
      className: "text-right",
      cell: (u) => (
        <div className="flex items-center justify-end gap-1">
          <Button size="sm" variant="outline" onClick={() => setEditing(u)} disabled={!!u.deletedAt}>
            Edit
          </Button>
          <RowMenu
            disabled={!!u.deletedAt}
            items={[
              { label: "Send password reset", onSelect: () => setResetting(u) },
              ...(u.id !== currentUserId
                ? [
                    { label: u.isActive ? "Deactivate" : "Activate", onSelect: () => setToggling(u) },
                    { label: "Delete…", onSelect: () => setDeleting(u), destructive: true },
                  ]
                : []),
            ]}
          />
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <SearchBox placeholder="Search name or email" />
        <FilterSelect param="role" label="All roles" options={roles.map((r) => ({ value: r.id, label: r.name }))} />
        <FilterSelect
          param="status"
          label="Any status"
          options={[
            { value: "active", label: "Active" },
            { value: "inactive", label: "Inactive" },
          ]}
        />
        <Button className="ml-auto" onClick={() => setCreating(true)}>
          <UserPlus className="h-4 w-4" /> Create user
        </Button>
      </div>

      <DataTable
        columns={columns}
        rows={users}
        rowKey={(u) => u.id}
        total={total}
        page={page}
        pageSize={pageSize}
        sort={sort}
        dir={dir}
        caption="Users"
        empty={<EmptyState title="No users match" description="Change the search or the filters, or create someone." />}
      />

      <CreateDialog open={creating} onClose={() => setCreating(false)} roles={roles} careers={careers} />
      <EditDialog user={editing} onClose={() => setEditing(null)} roles={roles} isSelf={editing?.id === currentUserId} />

      <ConfirmDialog
        open={!!toggling}
        onClose={() => setToggling(null)}
        title={toggling?.isActive ? "Deactivate this account?" : "Activate this account?"}
        description={
          toggling?.isActive
            ? `${toggling?.name} will no longer be able to use Nexa until you activate the account again.`
            : `${toggling?.name} will be able to use Nexa again.`
        }
        confirmLabel={toggling?.isActive ? "Deactivate" : "Activate"}
        destructive={!!toggling?.isActive}
        onConfirm={async () => {
          const r = await setUserActiveAction(toggling!.id, !toggling!.isActive);
          if (!r.ok) {
            toast.error(r.error);
            return false;
          }
          toast.success(toggling!.isActive ? "Account deactivated" : "Account activated");
        }}
      />

      <ConfirmDialog
        open={!!resetting}
        onClose={() => setResetting(null)}
        title="Send a password reset email?"
        description={`${resetting?.name} will receive an email with a link to choose a new password.`}
        confirmLabel="Send email"
        onConfirm={async () => {
          const r = await resetPasswordAction(resetting!.id);
          if (!r.ok) {
            toast.error(r.error);
            return false;
          }
          toast.success("Password reset email sent");
        }}
      />

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        title="Delete this user?"
        description={
          <>
            <p>
              <strong>{deleting?.name}</strong> will be removed. Their open sessions are cancelled.
            </p>
            <p className="mt-2">
              If the account has history (requests, messages, reports) it is kept in the database but anonymised and blocked from signing in;
              otherwise it is erased completely. This cannot be undone.
            </p>
          </>
        }
        confirmLabel="Delete user"
        destructive
        onConfirm={async () => {
          const r = await deleteUserAction(deleting!.id);
          if (!r.ok) {
            toast.error(r.error);
            return false;
          }
          toast.success(r.data.mode === "hard" ? "User deleted" : "User deleted (history kept, anonymised)");
        }}
      />
    </div>
  );
}

function CreateDialog({ open, onClose, roles, careers }: { open: boolean; onClose: () => void; roles: RoleOption[]; careers: Career[] }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [roleId, setRoleId] = useState("");
  const [dob, setDob] = useState("");
  const [careerId, setCareerId] = useState("");
  const [bio, setBio] = useState("");
  const [experienceYears, setExperienceYears] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const level = roles.find((r) => r.id === roleId)?.access_level;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    
    const r = await createUserAction({
      name,
      email,
      password,
      roleId,
      dateOfBirth: level === "student" ? dob : undefined,
      careerId: level === "professional" ? careerId : undefined,
      bio: level === "professional" ? bio : undefined,
      experienceYears: level === "professional" ? experienceYears : undefined,
    });
    
    setBusy(false);
    if (!r.ok) return setError(r.error);
    
    toast.success(`User ${email} created successfully`);
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="Create a user" description="Set up an account manually. They can change their password later.">
      <form onSubmit={submit} className="space-y-4">
        <Field label="Full name" htmlFor="create-name">
          <Input id="create-name" value={name} onChange={(e) => setName(e.target.value)} required maxLength={100} autoComplete="off" />
        </Field>
        <Field label="Email" htmlFor="create-email">
          <Input id="create-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="off" />
        </Field>
        <Field label="Temporary Password" htmlFor="create-password" hint="At least 8 characters. Tell the user to change it after they log in.">
          <Input id="create-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="new-password" minLength={8} />
        </Field>
        <Field label="Role" htmlFor="create-role">
          <RoleSelect id="create-role" roles={roles} value={roleId} onChange={setRoleId} required />
        </Field>
        
        {level === "student" && (
          <Field label="Date of birth" htmlFor="create-dob" hint="Invited students must be 18 or older. Under-18s sign up themselves so their guardian can consent.">
            <Input id="create-dob" type="date" value={dob} onChange={(e) => setDob(e.target.value)} required />
          </Field>
        )}
        
        {level === "professional" && (
          <>
            <Field label="Career" htmlFor="create-career" hint="They will still need to upload credentials and be verified.">
              <Select id="create-career" value={careerId} onChange={(e) => setCareerId(e.target.value)} required>
                <option value="" disabled>Choose a career…</option>
                {careers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </Field>
            <Field label="Years of Experience" htmlFor="create-years">
              <Input id="create-years" type="number" min={0} max={70} value={experienceYears} onChange={(e) => setExperienceYears(e.target.value)} required />
            </Field>
            <Field label="Professional Bio" htmlFor="create-bio">
              <Input id="create-bio" value={bio} onChange={(e) => setBio(e.target.value)} required />
            </Field>
          </>
        )}
        
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        
        <ModalActions>
          <Button type="button" variant="outline" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button type="submit" disabled={busy || !roleId}>{busy ? "Creating…" : "Create user"}</Button>
        </ModalActions>
      </form>
    </Modal>
  );
}

function EditDialog({ user, onClose, roles, isSelf }: { user: AdminUser | null; onClose: () => void; roles: RoleOption[]; isSelf: boolean }) {
  return (
    <Modal open={!!user} onClose={onClose} title="Edit user">
      {user && <EditForm key={user.id} user={user} onClose={onClose} roles={roles} isSelf={isSelf} />}
    </Modal>
  );
}

function EditForm({ user, onClose, roles, isSelf }: { user: AdminUser; onClose: () => void; roles: RoleOption[]; isSelf: boolean }) {
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email ?? "");
  const [roleId, setRoleId] = useState(user.roleId);
  const [active, setActive] = useState(user.isActive);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const changes = {
      userId: user.id,
      name: name !== user.name ? name : undefined,
      email: email.trim().toLowerCase() !== (user.email ?? "").toLowerCase() ? email : undefined,
      roleId: roleId !== user.roleId ? roleId : undefined,
      isActive: active !== user.isActive ? active : undefined,
    };
    if (Object.values(changes).every((v, i) => i === 0 || v === undefined)) return onClose();
    setBusy(true);
    setError("");
    const r = await updateUserAction(changes);
    setBusy(false);
    if (!r.ok) return setError(r.error);
    toast.success("User updated");
    onClose();
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Full name" htmlFor="edit-name">
        <Input id="edit-name" value={name} onChange={(e) => setName(e.target.value)} required maxLength={100} />
      </Field>
      <Field label="Email" htmlFor="edit-email" hint="Changing the email takes effect immediately; the user signs in with the new one.">
        <Input id="edit-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </Field>
      <Field label="Role" htmlFor="edit-role" hint={isSelf ? "You cannot change your own role." : "Changing the role changes what the person can do on the platform."}>
        <RoleSelect id="edit-role" roles={roles} value={roleId} onChange={setRoleId} disabled={isSelf} />
      </Field>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} disabled={isSelf} className="h-4 w-4" />
        Account is active
      </label>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <ModalActions>
        <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        <Button type="submit" disabled={busy}>
          {busy ? "Saving…" : "Save changes"}
        </Button>
      </ModalActions>
    </form>
  );
}