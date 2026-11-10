import { requireAccessLevel } from "@/lib/auth";

// Courses are for students (admins manage them in /admin/courses).
export default async function CoursesLayout({ children }: { children: React.ReactNode }) {
  await requireAccessLevel("student");
  return <>{children}</>;
}
