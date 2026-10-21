import { requireAccessLevel } from "@/lib/auth";

// Route guard for the whole /admin section: wrong role or signed out => redirected.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAccessLevel("admin");
  return <>{children}</>;
}
