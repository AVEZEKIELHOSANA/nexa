"use client";

import { useRef, useState } from "react";
import { Paperclip, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { DataTable, type Column } from "@/components/data-table";
import { EmptyState } from "@/components/empty-state";
import { FilterSelect, SearchBox } from "@/components/table-filters";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";
import { ConfirmDialog, Modal, ModalActions } from "@/components/ui/modal";
import { COURSE_ASSET_MAX_BYTES, COURSE_ASSET_MAX_FILES, COURSE_ASSET_TYPES, assetLabel, safeFileName } from "@/lib/assets";
import type { AdminCourse } from "@/lib/data/admin-courses";
import { uploadFile } from "@/lib/data/uploads";
import { formatDate } from "@/lib/format";
import { createCourseAction, deleteCourseAction, deleteCourseAssetFileAction, setCourseAssetsAction, setCoursePublishedAction, updateCourseAction } from "./actions";

export function CoursesManager({ courses, total, page, pageSize }: { courses: AdminCourse[]; total: number; page: number; pageSize: number }) {
  const [editing, setEditing] = useState<AdminCourse | "new" | null>(null);
  const [deleting, setDeleting] = useState<AdminCourse | null>(null);
  const [toggling, setToggling] = useState<AdminCourse | null>(null);

  const columns: Column<AdminCourse>[] = [
    {
      key: "title",
      header: "Course",
      cell: (c) => (
        <div>
          <p className="font-medium">{c.title}</p>
          <p className="text-xs text-muted-foreground">
            {c.topic ?? "No topic"}
            {c.estimatedMinutes ? ` · ${c.estimatedMinutes} min` : ""}
            {c.assetPaths.length > 0 ? ` · ${c.assetPaths.length} file${c.assetPaths.length === 1 ? "" : "s"}` : ""}
          </p>
        </div>
      ),
    },
    { key: "status", header: "Status", cell: (c) => <Badge tone={c.isPublished ? "success" : "neutral"}>{c.isPublished ? "Published" : "Draft"}</Badge> },
    { key: "done", header: "Completed by", className: "tabular-nums", cell: (c) => c.completions },
    { key: "created", header: "Created", cell: (c) => formatDate(c.createdAt) },
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
            {c.isPublished ? "Unpublish" : "Publish"}
          </Button>
          <Button size="icon" variant="ghost" onClick={() => setDeleting(c)} aria-label={`Delete ${c.title}`}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <SearchBox placeholder="Search courses" />
        <FilterSelect
          param="status"
          label="All courses"
          options={[
            { value: "published", label: "Published" },
            { value: "draft", label: "Drafts" },
          ]}
        />
        <Button className="ml-auto" onClick={() => setEditing("new")}>
          <Plus className="h-4 w-4" /> New course
        </Button>
      </div>

      <DataTable
        columns={columns}
        rows={courses}
        rowKey={(c) => c.id}
        total={total}
        page={page}
        pageSize={pageSize}
        caption="Courses"
        empty={<EmptyState title="No courses found" description="Write the first course, or change the filters." />}
      />

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing === "new" ? "New course" : "Edit course"} className="w-[min(94vw,44rem)]">
        {editing && <CourseForm key={editing === "new" ? "new" : editing.id} course={editing === "new" ? null : editing} onClose={() => setEditing(null)} />}
      </Modal>

      <ConfirmDialog
        open={!!toggling}
        onClose={() => setToggling(null)}
        title={toggling?.isPublished ? "Unpublish this course?" : "Publish this course?"}
        description={toggling?.isPublished ? `"${toggling?.title}" will be hidden from students. Their completion records are kept.` : `"${toggling?.title}" will be visible to every student.`}
        confirmLabel={toggling?.isPublished ? "Unpublish" : "Publish"}
        onConfirm={async () => {
          const r = await setCoursePublishedAction(toggling!.id, !toggling!.isPublished);
          if (!r.ok) {
            toast.error(r.error);
            return false;
          }
          toast.success(toggling!.isPublished ? "Course unpublished" : "Course published");
        }}
      />

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        title="Delete this course?"
        description={`"${deleting?.title}", its attached files and the ${deleting?.completions ?? 0} completion record(s) will be permanently deleted. Unpublish it instead to keep the records.`}
        confirmLabel="Delete course"
        destructive
        onConfirm={async () => {
          const r = await deleteCourseAction(deleting!.id);
          if (!r.ok) {
            toast.error(r.error);
            return false;
          }
          toast.success("Course deleted");
        }}
      />
    </div>
  );
}

function CourseForm({ course, onClose }: { course: AdminCourse | null; onClose: () => void }) {
  const [courseId, setCourseId] = useState<string | null>(course?.id ?? null);
  const [title, setTitle] = useState(course?.title ?? "");
  const [topic, setTopic] = useState(course?.topic ?? "");
  const [minutes, setMinutes] = useState(course?.estimatedMinutes ? String(course.estimatedMinutes) : "");
  const [content, setContent] = useState(course?.content ?? "");
  const [published, setPublished] = useState(course?.isPublished ?? false);
  const [assets, setAssets] = useState<string[]>(course?.assetPaths ?? []);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const input = { title, topic, content, estimatedMinutes: minutes.trim() ? Number(minutes) : null, isPublished: published };
    if (courseId) {
      const r = await updateCourseAction(courseId, input);
      setBusy(false);
      if (!r.ok) return setError(r.error);
      toast.success("Course saved");
      onClose();
    } else {
      const r = await createCourseAction(input);
      setBusy(false);
      if (!r.ok) return setError(r.error);
      // stay open: files can only be attached once the course has an id
      setCourseId(r.data.id);
      toast.success("Course created. You can now attach files.");
    }
  }

  async function addFiles(files: FileList | null) {
    if (!files || files.length === 0 || !courseId) return;
    setError("");
    const list = Array.from(files);
    if (assets.length + list.length > COURSE_ASSET_MAX_FILES) return setError(`A course can have at most ${COURSE_ASSET_MAX_FILES} files.`);
    for (const f of list) {
      if (!COURSE_ASSET_TYPES.includes(f.type)) return setError(`"${f.name}" is not an allowed type. Use JPG, PNG, WebP, GIF, MP3, M4A, WAV, OGG or PDF.`);
      if (f.size > COURSE_ASSET_MAX_BYTES) return setError(`"${f.name}" is larger than 10 MB.`);
    }
    setUploading(true);
    const added: string[] = [];
    try {
      for (const f of list) {
        const path = `${courseId}/${crypto.randomUUID().slice(0, 8)}-${safeFileName(f.name)}`;
        await uploadFile("course-assets", path, f);
        added.push(path);
      }
      const next = [...assets, ...added];
      const r = await setCourseAssetsAction(courseId, next);
      if (!r.ok) throw new Error(r.error);
      setAssets(next);
      toast.success(added.length === 1 ? "File attached" : `${added.length} files attached`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "The upload failed.");
      // files uploaded but not attached would be orphans: remove them
      await Promise.all(added.map((p) => deleteCourseAssetFileAction(courseId, p)));
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  async function removeAsset(path: string) {
    if (!courseId) return;
    setError("");
    const next = assets.filter((p) => p !== path);
    const r = await setCourseAssetsAction(courseId, next);
    if (!r.ok) return setError(r.error);
    setAssets(next);
    await deleteCourseAssetFileAction(courseId, path); // best effort: the file is already detached
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Title" htmlFor="course-title">
        <Input id="course-title" value={title} onChange={(e) => setTitle(e.target.value)} required minLength={3} maxLength={120} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Topic" htmlFor="course-topic" hint="Students filter by topic. Reuse an existing one.">
          <Input id="course-topic" value={topic} onChange={(e) => setTopic(e.target.value)} maxLength={60} />
        </Field>
        <Field label="Estimated minutes" htmlFor="course-minutes">
          <Input id="course-minutes" type="number" inputMode="numeric" min={1} max={600} value={minutes} onChange={(e) => setMinutes(e.target.value)} />
        </Field>
      </div>
      <Field label="Course text" htmlFor="course-content" hint="Plain text. Use a blank line between paragraphs, “## ” for headings and “- ” for bullet points.">
        <Textarea id="course-content" value={content} onChange={(e) => setContent(e.target.value)} rows={10} maxLength={20000} />
      </Field>

      <fieldset className="min-w-0 space-y-2 rounded-lg border p-3">
        <legend className="px-1 text-sm font-medium">Attached files</legend>
        {!courseId ? (
          <p className="text-sm text-muted-foreground">Save the course first, then you can attach images, audio or PDFs.</p>
        ) : (
          <>
            {assets.length === 0 && <p className="text-sm text-muted-foreground">No files yet.</p>}
            <ul className="space-y-1">
              {assets.map((p) => (
                <li key={p} className="flex min-w-0 items-center justify-between gap-2 rounded bg-muted/50 px-2 py-1.5 text-sm">
                  <span className="inline-flex min-w-0 items-center gap-2">
                    <Paperclip className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    <span className="truncate">{assetLabel(p)}</span>
                  </span>
                  <button type="button" onClick={() => removeAsset(p)} className="shrink-0 text-xs text-destructive hover:underline" aria-label={`Remove ${assetLabel(p)}`}>
                    Remove
                  </button>
                </li>
              ))}
            </ul>
            <div>
              <input ref={fileInput} id="course-files" type="file" multiple accept={COURSE_ASSET_TYPES.join(",")} className="sr-only" onChange={(e) => addFiles(e.target.files)} disabled={uploading} />
              <Button type="button" variant="outline" size="sm" disabled={uploading || assets.length >= COURSE_ASSET_MAX_FILES} onClick={() => fileInput.current?.click()}>
                {uploading ? "Uploading…" : "Add files"}
              </Button>
              <p className="mt-1 text-xs text-muted-foreground">JPG, PNG, WebP, GIF, MP3, M4A, WAV, OGG or PDF. Up to 10 MB each, 10 files per course.</p>
            </div>
          </>
        )}
      </fieldset>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} className="h-4 w-4" />
        Published (visible to students)
      </label>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <ModalActions>
        <Button type="button" variant="outline" onClick={onClose} disabled={busy || uploading}>
          {courseId ? "Close" : "Cancel"}
        </Button>
        <Button type="submit" disabled={busy || uploading}>
          {busy ? "Saving…" : courseId ? "Save course" : "Create course"}
        </Button>
      </ModalActions>
    </form>
  );
}
