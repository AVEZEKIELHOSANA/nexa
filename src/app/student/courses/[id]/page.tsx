import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2, Clock } from "lucide-react";
import { CompleteCourseButton } from "@/components/complete-course-button";
import { CourseAssets } from "@/components/course-assets";
import { CourseCard } from "@/components/course-card";
import { CourseContent } from "@/components/course-content";
import { Badge } from "@/components/ui/badge";
import { courseAssetUrls, getCourse, listRelatedCourses } from "@/lib/data/courses";
import { getCompletionMap } from "@/lib/data/progress";
import { formatDate } from "@/lib/format";
import { isUuid } from "@/lib/pagination";

export const metadata: Metadata = { title: "Course" };

export default async function CoursePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const course = await getCourse(id); // RLS hides drafts from students: they get a 404 like any missing course
  if (!course || !course.isPublished) notFound();

  const [completion, assets, related] = await Promise.all([getCompletionMap([id]), courseAssetUrls(course.assetPaths), listRelatedCourses(course)]);
  const completedAt = completion[id];
  const relatedDone = await getCompletionMap(related.map((c) => c.id));

  return (
    <article className="mx-auto max-w-3xl space-y-8">
      <div className="space-y-3">
        <Link href="/student/courses" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" aria-hidden /> All courses
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          {course.topic && <Badge tone="info">{course.topic}</Badge>}
          {course.estimatedMinutes && (
            <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" aria-hidden /> {course.estimatedMinutes} min
            </span>
          )}
        </div>
        <h1 className="text-3xl font-semibold tracking-tight [overflow-wrap:anywhere]">{course.title}</h1>
      </div>

      {course.content ? <CourseContent text={course.content} /> : <p className="text-muted-foreground">This course has no text yet.</p>}
      <CourseAssets assets={assets} />

      <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-muted/30 p-4">
        {completedAt ? (
          <p className="inline-flex items-center gap-2 font-medium text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 className="h-5 w-5" aria-hidden /> You completed this course on {formatDate(completedAt)}
          </p>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">Finished reading? Save your progress.</p>
            <CompleteCourseButton courseId={id} />
          </>
        )}
      </div>

      {related.length > 0 && (
        <section aria-labelledby="related" className="space-y-3">
          <h2 id="related" className="text-lg font-semibold">
            More on {course.topic}
          </h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {related.map((c) => (
              <CourseCard key={c.id} course={c} completed={!!relatedDone[c.id]} />
            ))}
          </div>
        </section>
      )}
    </article>
  );
}
