import { requireAccessLevel } from "@/lib/auth";

// Route guard for the whole /pro section: wrong role or signed out => redirected.
export default async function ProfessionalLayout({ children }: { children: React.ReactNode }) {
  await requireAccessLevel("professional");
  return <>{children}</>;
}
