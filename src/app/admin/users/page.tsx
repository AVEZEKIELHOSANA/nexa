import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { getCurrentUser } from "@/lib/auth";
import { listActiveCareers } from "@/lib/data/careers";
import { listRoleOptions } from "@/lib/data/admin-roles";
import { listUsers } from "@/lib/data/admin-users";
import { PAGE_SIZE, oneOf, param, parsePage, type SearchParams } from "@/lib/pagination";
import { UsersManager } from "./users-manager";

export const metadata: Metadata = { title: "Users" };

export default async function UsersPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const page = parsePage(sp);
  const sort = oneOf(sp, "sort", ["name", "email", "role", "created_at"] as const) ?? "created_at";
  const dir = oneOf(sp, "dir", ["asc", "desc"] as const) ?? (sort === "created_at" ? "desc" : "asc");
  const status = oneOf(sp, "status", ["active", "inactive"] as const);

  const [me, { users, total }, roles, careers] = await Promise.all([
    getCurrentUser(),
    listUsers({
      search: param(sp, "q"),
      roleId: param(sp, "role"),
      active: status ? status === "active" : undefined,
      sort,
      desc: dir === "desc",
      page,
      pageSize: PAGE_SIZE,
    }),
    listRoleOptions(),
    listActiveCareers(),
  ]);

  return (
    <>
      <PageHeader title="Users" description="Invite people, change roles, deactivate or delete accounts. Every change is written to the activity log." />
      <UsersManager
        users={users}
        total={total}
        page={page}
        pageSize={PAGE_SIZE}
        sort={sort}
        dir={dir}
        roles={roles}
        careers={careers}
        currentUserId={me?.id ?? ""}
      />
    </>
  );
}
