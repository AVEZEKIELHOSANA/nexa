import type { Metadata } from "next";
import { CourseCard } from "@/components/course-card";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Pagination } from "@/components/pagination";
import { FilterSelect } from "@/components/table-filters";
import { listCourseTopics, listPublishedCourses } from "@/lib/data/courses";
import { getCompletionMap } from "@/lib/data/progress";
import { param, parsePage, type SearchParams } from "@/lib/pagination";

export const metadata: Metadata = { title: "Courses" };

const SIZE = 12;

export default async function CoursesPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const page = parsePage(sp);
  const topic = param(sp, "topic");
  const [{ courses, total }, topics] = await Promise.all([listPublishedCourses({ topic, page, pageSize: SIZE }), listCourseTopics()]);
  const done = await getCompletionMap(courses.map((c) => c.id));

  return (
    <>
      <PageHeader title="Courses" description="Short lessons on careers, studying and getting ready for work. Read at your own pace and mark each one complete." />
      <div className="space-y-5">
        {topics.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <FilterSelect param="topic" label="All topics" options={topics.map((t) => ({ value: t, label: t }))} />
          </div>
        )}
        {courses.length === 0 ? (
          <EmptyState title={topic ? "No courses in this topic" : "No courses yet"} description={topic ? "Pick another topic, or clear the filter." : "New courses will appear here when they are published."} />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {courses.map((c) => (
              <CourseCard key={c.id} course={c} completed={!!done[c.id]} />
            ))}
          </div>
        )}
        <Pagination page={page} total={total} pageSize={SIZE} />
      </div>
    </>
  );
}
