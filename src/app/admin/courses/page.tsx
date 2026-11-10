import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { listCoursesAdmin } from "@/lib/data/admin-courses";
import { PAGE_SIZE, oneOf, param, parsePage, type SearchParams } from "@/lib/pagination";
import { CoursesManager } from "./courses-manager";

export const metadata: Metadata = { title: "Courses" };

export default async function AdminCoursesPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const page = parsePage(sp);
  const { courses, total } = await listCoursesAdmin({ search: param(sp, "q"), status: oneOf(sp, "status", ["published", "draft"] as const), page, pageSize: PAGE_SIZE });
  return (
    <>
      <PageHeader title="Courses" description="Write courses, attach images, audio or PDFs, and publish them for students. Drafts are visible only to administrators." />
      <CoursesManager courses={courses} total={total} page={page} pageSize={PAGE_SIZE} />
    </>
  );
}
