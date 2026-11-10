import { requireAccessLevel } from "@/lib/auth";

// Browsing careers and mentors is a student feature.
export default async function CareersLayout({ children }: { children: React.ReactNode }) {
  await requireAccessLevel("student");
  return <>{children}</>;
}
