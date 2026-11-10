import "server-only";
import { createClient } from "@/lib/supabase/server";
import { rangeFor } from "@/lib/pagination";

/** Which of these courses the signed-in student has completed (id -> completion time). */
export async function getCompletionMap(courseIds: string[]): Promise<Record<string, string>> {
  if (courseIds.length === 0) return {};
  const supabase = await createClient();
  const { data, error } = await supabase.from("course_progress").select("course_id, completed_at").in("course_id", courseIds);
  if (error) throw new Error(`Could not load your progress: ${error.message}`);
  return Object.fromEntries((data ?? []).map((r) => [r.course_id, r.completed_at]));
}

/** Marks a course complete. Completing twice is harmless. */
export async function markCourseComplete(studentId: string, courseId: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("course_progress").upsert({ student_id: studentId, course_id: courseId }, { onConflict: "student_id,course_id", ignoreDuplicates: true });
  if (error) throw error;
}

export type CompletedCourse = { courseId: string; title: string; topic: string | null; estimatedMinutes: number | null; completedAt: string };

export async function listCompletedCourses(opts: { page?: number; pageSize?: number } = {}): Promise<{ items: CompletedCourse[]; total: number }> {
  const supabase = await createClient();
  const { from, to } = rangeFor(opts.page ?? 1, opts.pageSize ?? 20);
  const { data, error, count } = await supabase
    .from("course_progress")
    .select("course_id, completed_at, course:courses(title, topic, estimated_minutes)", { count: "exact" })
    .order("completed_at", { ascending: false })
    .range(from, to)
    .overrideTypes<{ course_id: string; completed_at: string; course: { title: string; topic: string | null; estimated_minutes: number | null } | null }[], { merge: false }>();
  if (error) throw new Error(`Could not load your progress: ${error.message}`);
  return {
    total: count ?? 0,
    items: (data ?? []).map((r) => ({ courseId: r.course_id, title: r.course?.title ?? "Course removed", topic: r.course?.topic ?? null, estimatedMinutes: r.course?.estimated_minutes ?? null, completedAt: r.completed_at })),
  };
}

export async function countPublishedCourses(): Promise<number> {
  const supabase = await createClient();
  const { count, error } = await supabase.from("courses").select("id", { count: "exact", head: true }).eq("is_published", true);
  if (error) throw new Error(`Could not count courses: ${error.message}`);
  return count ?? 0;
}

export async function countCompletedCourses(): Promise<number> {
  const supabase = await createClient();
  const { count, error } = await supabase.from("course_progress").select("course_id", { count: "exact", head: true });
  if (error) throw new Error(`Could not count your progress: ${error.message}`);
  return count ?? 0;
}
