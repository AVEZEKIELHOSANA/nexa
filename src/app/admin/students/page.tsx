import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { requireAccessLevel } from "@/lib/auth";
import { listStudents } from "@/lib/data/admin-students";
import { PAGE_SIZE, oneOf, param, parsePage, type SearchParams } from "@/lib/pagination";
import { StudentsManager } from "./students-manager";

export const metadata: Metadata = { title: "Students" };

export default async function AdminStudentsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const me = await requireAccessLevel("admin");
  const page = parsePage(sp);
  const { students, total } = await listStudents({ search: param(sp, "q"), status: oneOf(sp, "status", ["active", "inactive", "awaiting_consent"] as const), page, pageSize: PAGE_SIZE });
  return (
    <>
      <PageHeader title="Students" description="Every student account, whether their guardian has confirmed (under 18), and how they use the platform. Dates of birth are never shown." />
      <StudentsManager students={students} total={total} page={page} pageSize={PAGE_SIZE} currentUserId={me.id} />
    </>
  );
}
