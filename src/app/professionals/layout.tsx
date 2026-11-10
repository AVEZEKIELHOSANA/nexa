import { requireAccessLevel } from "@/lib/auth";

export default async function ProfessionalsLayout({ children }: { children: React.ReactNode }) {
  await requireAccessLevel("student");
  return <>{children}</>;
}
