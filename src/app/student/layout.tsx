import { requireAccessLevel } from "@/lib/auth";

// Route guard for the whole /student section: wrong role or signed out => redirected.
export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  await requireAccessLevel("student");
  return <>{children}</>;
}
