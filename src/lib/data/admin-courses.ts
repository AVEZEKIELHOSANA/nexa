import "server-only";
import { createClient } from "@/lib/supabase/server";
import { PAGE_SIZE, rangeFor } from "@/lib/pagination";
import type { Course } from "@/lib/data/courses";

export type CourseInput = { title: string; topic?: string; content?: string; estimatedMinutes?: number | null; isPublished: boolean };

type Row = { id: string; title: string; topic: string | null; content: string | null; estimated_minutes: number | null; is_published: boolean; asset_paths: string[]; created_at: string; progress: { count: number }[] | null };

export type AdminCourse = Course & { completions: number };

export async function listCoursesAdmin(opts: { search?: string; status?: "published" | "draft"; page?: number; pageSize?: number }): Promise<{ courses: AdminCourse[]; total: number }> {
  const supabase = await createClient();
  const { from, to } = rangeFor(opts.page ?? 1, opts.pageSize ?? PAGE_SIZE);
  let query = supabase
    .from("courses")
    .select("id, title, topic, content, estimated_minutes, is_published, asset_paths, created_at, progress:course_progress(count)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);
  if (opts.status) query = query.eq("is_published", opts.status === "published");
  if (opts.search) query = query.ilike("title", `%${opts.search.replace(/[%_\\]/g, (c) => `\\${c}`)}%`);
  const { data, error, count } = await query.overrideTypes<Row[], { merge: false }>();
  if (error) throw new Error(`Could not load courses: ${error.message}`);
  return {
    total: count ?? 0,
    courses: (data ?? []).map((r) => ({
      id: r.id, title: r.title, topic: r.topic, content: r.content, estimatedMinutes: r.estimated_minutes, isPublished: r.is_published, assetPaths: r.asset_paths ?? [], createdAt: r.created_at,
      completions: r.progress?.[0]?.count ?? 0,
    })),
  };
}

const toRow = (i: CourseInput) => ({ title: i.title, topic: i.topic || null, content: i.content || null, estimated_minutes: i.estimatedMinutes ?? null, is_published: i.isPublished });

export async function createCourse(input: CourseInput): Promise<string> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("courses").insert(toRow(input)).select("id").single();
  if (error) throw error;
  return data.id;
}

export async function updateCourse(id: string, input: CourseInput): Promise<void> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("courses").update(toRow(input)).eq("id", id).select("id");
  if (error) throw error;
  if (!data || data.length === 0) throw new Error("This course no longer exists.");
}

export async function setCoursePublished(id: string, isPublished: boolean): Promise<void> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("courses").update({ is_published: isPublished }).eq("id", id).select("id");
  if (error) throw error;
  if (!data || data.length === 0) throw new Error("This course no longer exists.");
}

export async function setCourseAssets(id: string, paths: string[]): Promise<void> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("courses").update({ asset_paths: paths }).eq("id", id).select("id");
  if (error) throw error;
  if (!data || data.length === 0) throw new Error("This course no longer exists.");
}

/** Deletes the course (its completions go with it) and its files. */
export async function deleteCourse(id: string): Promise<void> {
  const supabase = await createClient();
  const { data: course } = await supabase.from("courses").select("asset_paths").eq("id", id).maybeSingle();
  const { data, error } = await supabase.from("courses").delete().eq("id", id).select("id");
  if (error) throw error;
  if (!data || data.length === 0) throw new Error("This course no longer exists.");
  if (course?.asset_paths?.length) await supabase.storage.from("course-assets").remove(course.asset_paths);
}

export async function removeCourseAssetFile(path: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.storage.from("course-assets").remove([path]);
  if (error) throw new Error("Could not delete the file.");
}
