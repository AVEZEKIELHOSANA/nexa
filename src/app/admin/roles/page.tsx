import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { listRolesWithCounts } from "@/lib/data/admin-roles";
import { RolesManager } from "./roles-manager";

export const metadata: Metadata = { title: "Roles" };

export default async function RolesPage() {
  const roles = await listRolesWithCounts();
  return (
    <>
      <PageHeader
        title="Roles"
        description="A role is a name people see; its access level decides what they can do. The three built-in roles cannot be changed. A role can only be deleted while nobody holds it."
      />
      <RolesManager roles={roles} />
    </>
  );
}
