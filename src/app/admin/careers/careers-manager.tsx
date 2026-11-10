"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { DataTable, type Column } from "@/components/data-table";
import { EmptyState } from "@/components/empty-state";
import { FilterSelect, SearchBox } from "@/components/table-filters";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";
import { ConfirmDialog, Modal, ModalActions } from "@/components/ui/modal";
import type { AdminCareer } from "@/lib/data/admin-careers";
import { createCareerAction, setCareerActiveAction, updateCareerAction } from "./actions";

export function CareersManager({ careers, total, page, pageSize }: { careers: AdminCareer[]; total: number; page: number; pageSize: number }) {
  const [editing, setEditing] = useState<AdminCareer | "new" | null>(null);
  const [toggling, setToggling] = useState<AdminCareer | null>(null);

  const columns: Column<AdminCareer>[] = [
    {
      key: "name",
      header: "Career",
      cell: (c) => (
        <div>
          <p className="font-medium">{c.name}</p>
          {c.description && <p className="line-clamp-2 max-w-xl text-xs text-muted-foreground">{c.description}</p>}
        </div>
      ),
    },
    { key: "status", header: "Status", cell: (c) => <Badge tone={c.isActive ? "success" : "neutral"}>{c.isActive ? "Active" : "Archived"}</Badge> },
    {
      key: "actions",
      header: "",
      className: "text-right",
      cell: (c) => (
        <div className="flex justify-end gap-1">
          <Button size="sm" variant="outline" onClick={() => setEditing(c)}>
            Edit
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setToggling(c)}>
            {c.isActive ? "Archive" : "Restore"}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <SearchBox placeholder="Search careers" />
        <FilterSelect
          param="status"
          label="All careers"
          options={[
            { value: "active", label: "Active" },
            { value: "archived", label: "Archived" },
          ]}
        />
        <Button className="ml-auto" onClick={() => setEditing("new")}>
          <Plus className="h-4 w-4" /> New career
        </Button>
      </div>

      <DataTable
        columns={columns}
        rows={careers}
        rowKey={(c) => c.id}
        total={total}
        page={page}
        pageSize={pageSize}
        caption="Careers"
        empty={<EmptyState title="No careers found" description="Add the first career field, or change the filters." />}
      />

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing === "new" ? "New career" : "Edit career"}>
        {editing && <CareerForm key={editing === "new" ? "new" : editing.id} career={editing === "new" ? null : editing} onClose={() => setEditing(null)} />}
      </Modal>

      <ConfirmDialog
        open={!!toggling}
        onClose={() => setToggling(null)}
        title={toggling?.isActive ? "Archive this career?" : "Restore this career?"}
        description={
          toggling?.isActive
            ? `"${toggling?.name}" will disappear from sign-up and browsing. Existing students and professionals keep it.`
            : `"${toggling?.name}" will be visible again.`
        }
        confirmLabel={toggling?.isActive ? "Archive" : "Restore"}
        destructive={!!toggling?.isActive}
        onConfirm={async () => {
          const r = await setCareerActiveAction(toggling!.id, !toggling!.isActive);
          if (!r.ok) {
            toast.error(r.error);
            return false;
          }
          toast.success(toggling!.isActive ? "Career archived" : "Career restored");
        }}
      />
    </div>
  );
}

function CareerForm({ career, onClose }: { career: AdminCareer | null; onClose: () => void }) {
  const [name, setName] = useState(career?.name ?? "");
  const [description, setDescription] = useState(career?.description ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const r = career ? await updateCareerAction({ id: career.id, name, description }) : await createCareerAction({ name, description });
    setBusy(false);
    if (!r.ok) return setError(r.error);
    toast.success(career ? "Career updated" : "Career created");
    onClose();
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Name" htmlFor="career-name">
        <Input id="career-name" value={name} onChange={(e) => setName(e.target.value)} required minLength={2} maxLength={80} />
      </Field>
      <Field label="Description" htmlFor="career-desc" hint="Shown to students on the career card. One or two sentences.">
        <Textarea id="career-desc" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500} rows={4} />
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
        <Button type="submit" disabled={busy}>
          {busy ? "Saving…" : "Save career"}
        </Button>
      </ModalActions>
    </form>
  );
}
