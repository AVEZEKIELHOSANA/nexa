import { getCurrentUser } from "@/lib/auth";

// Placeholder. The real Professional dashboard is built later in the plan.
export default async function ProfessionalHome() {
  const user = await getCurrentUser();
  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-semibold">Welcome, {user?.name}</h1>
      <p className="text-muted-foreground">You are signed in as: {user?.roleName}. This page is a placeholder.</p>
    </div>
  );
}
