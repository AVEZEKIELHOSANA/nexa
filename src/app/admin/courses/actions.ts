"use server";

import { revalidatePath } from "next/cache";
import { assertAccessLevel } from "@/lib/auth-guards";
import { fail, ok, type ActionResult } from "@/lib/action";
import { isUuid } from "@/lib/pagination";
import { COURSE_ASSET_MAX_FILES } from "@/lib/assets";
import { createCourse, deleteCourse, removeCourseAssetFile, setCourseAssets, setCoursePublished, updateCourse, type CourseInput } from "@/lib/data/admin-courses";

type FormInput = { title: string; topic?: string; content?: string; estimatedMinutes?: number | null; isPublished: boolean };

function clean(input: FormInput): CourseInput {
  const title = input.title.trim();
  if (title.length < 3 || title.length > 120) throw new Error("The title must be 3 to 120 characters.");
  const topic = (input.topic ?? "").trim();
  if (topic.length > 60) throw new Error("The topic is limited to 60 characters.");
  const content = input.content ?? "";
  if (content.length > 20000) throw new Error("The course text is limited to 20,000 characters.");
  let minutes: number | null = input.estimatedMinutes ?? null;
  if (minutes !== null) {
    if (!Number.isInteger(minutes) || minutes < 1 || minutes > 600) throw new Error("Estimated time must be between 1 and 600 minutes.");
  } else minutes = null;
  if (input.isPublished && content.trim().length === 0) throw new Error("Add the course text before publishing.");
  return { title, topic, content, estimatedMinutes: minutes, isPublished: input.isPublished };
}

function refresh(id?: string) {
  revalidatePath("/admin/courses");
  revalidatePath("/courses");
  revalidatePath("/student/learning");
  if (id) revalidatePath(`/courses/${id}`);
}

export async function createCourseAction(input: FormInput): Promise<ActionResult<{ id: string }>> {
  try {
    await assertAccessLevel("admin");
    const id = await createCourse(clean(input));
    refresh();
    return ok({ id });
  } catch (e) {
    return fail(e);
  }
}

export async function updateCourseAction(id: string, input: FormInput): Promise<ActionResult> {
  try {
    await assertAccessLevel("admin");
    if (!isUuid(id)) throw new Error("Unknown course.");
    await updateCourse(id, clean(input));
    refresh(id);
    return ok();
  } catch (e) {
    return fail(e);
  }
}

export async function setCoursePublishedAction(id: string, isPublished: boolean): Promise<ActionResult> {
  try {
    await assertAccessLevel("admin");
    if (!isUuid(id)) throw new Error("Unknown course.");
    await setCoursePublished(id, isPublished);
    refresh(id);
    return ok();
  } catch (e) {
    return fail(e);
  }
}

/** Replaces the list of attached files (the browser has already uploaded new ones). */
export async function setCourseAssetsAction(id: string, paths: string[]): Promise<ActionResult> {
  try {
    await assertAccessLevel("admin");
    if (!isUuid(id)) throw new Error("Unknown course.");
    if (!Array.isArray(paths) || paths.length > COURSE_ASSET_MAX_FILES) throw new Error(`A course can have at most ${COURSE_ASSET_MAX_FILES} files.`);
    if (paths.some((p) => typeof p !== "string" || !p.startsWith(`${id}/`) || p.includes(".."))) throw new Error("Files must belong to this course.");
    await setCourseAssets(id, paths);
    refresh(id);
    return ok();
  } catch (e) {
    return fail(e);
  }
}

/** Deletes one uploaded file from storage (after it was detached from the course). */
export async function deleteCourseAssetFileAction(id: string, path: string): Promise<ActionResult> {
  try {
    await assertAccessLevel("admin");
    if (!isUuid(id) || typeof path !== "string" || !path.startsWith(`${id}/`) || path.includes("..")) throw new Error("Files must belong to this course.");
    await removeCourseAssetFile(path);
    return ok();
  } catch (e) {
    return fail(e);
  }
}

export async function deleteCourseAction(id: string): Promise<ActionResult> {
  try {
    await assertAccessLevel("admin");
    if (!isUuid(id)) throw new Error("Unknown course.");
    await deleteCourse(id);
    refresh(id);
    return ok();
  } catch (e) {
    return fail(e);
  }
}
