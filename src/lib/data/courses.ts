import "server-only";
import { createClient } from "@/lib/supabase/server";
import { rangeFor } from "@/lib/pagination";

export type Course = {
  id: string;
  title: string;
  topic: string | null;
  content: string | null;
  estimatedMinutes: number | null;
  isPublished: boolean;
  assetPaths: string[];
  createdAt: string;
};

type Row = { id: string; title: string; topic: string | null; content: string | null; estimated_minutes: number | null; is_published: boolean; asset_paths: string[]; created_at: string };
const COLUMNS = "id, title, topic, content, estimated_minutes, is_published, asset_paths, created_at";
const map = (r: Row): Course => ({ id: r.id, title: r.title, topic: r.topic, content: r.content, estimatedMinutes: r.estimated_minutes, isPublished: r.is_published, assetPaths: r.asset_paths ?? [], createdAt: r.created_at });

/** Published courses, optionally one topic, newest first (RLS already hides drafts from students). */
export async function listPublishedCourses(opts: { topic?: string; page?: number; pageSize?: number }): Promise<{ courses: Course[]; total: number }> {
  const supabase = await createClient();
  const { from, to } = rangeFor(opts.page ?? 1, opts.pageSize ?? 12);
  let query = supabase.from("courses").select(COLUMNS, { count: "exact" }).eq("is_published", true).order("created_at", { ascending: false }).range(from, to);
  if (opts.topic) query = query.eq("topic", opts.topic);
  const { data, error, count } = await query;
  if (error) throw new Error(`Could not load courses: ${error.message}`);
  return { total: count ?? 0, courses: (data ?? []).map(map) };
}

/** Distinct topics of published courses, for the filter. */
export async function listCourseTopics(): Promise<string[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("courses").select("topic").eq("is_published", true).not("topic", "is", null).limit(1000);
  if (error) throw new Error(`Could not load topics: ${error.message}`);
  return [...new Set((data ?? []).map((r) => r.topic as string))].sort((a, b) => a.localeCompare(b));
}

export async function getCourse(id: string): Promise<Course | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("courses").select(COLUMNS).eq("id", id).maybeSingle();
  if (error) throw new Error(`Could not load the course: ${error.message}`);
  return data ? map(data) : null;
}

export async function listRelatedCourses(course: Course, limit = 3): Promise<Course[]> {
  if (!course.topic) return [];
  const supabase = await createClient();
  const { data, error } = await supabase.from("courses").select(COLUMNS).eq("is_published", true).eq("topic", course.topic).neq("id", course.id).order("created_at", { ascending: false }).limit(limit);
  if (error) throw new Error(`Could not load related courses: ${error.message}`);
  return (data ?? []).map(map);
}

/** Public URL of a file in the course-assets bucket (computed locally, no network call). */
export async function courseAssetUrl(path: string): Promise<string> {
  const supabase = await createClient();
  return supabase.storage.from("course-assets").getPublicUrl(path).data.publicUrl;
}

/** Public URLs for several files at once (one client, no network calls). */
export async function courseAssetUrls(paths: string[]): Promise<{ path: string; url: string }[]> {
  const supabase = await createClient();
  const bucket = supabase.storage.from("course-assets");
  return paths.map((path) => ({ path, url: bucket.getPublicUrl(path).data.publicUrl }));
}
