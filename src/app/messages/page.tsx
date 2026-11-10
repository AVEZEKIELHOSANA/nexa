import type { Metadata } from "next";
import Link from "next/link";
import { ConversationList } from "@/components/conversation-list";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Pagination } from "@/components/pagination";
import { buttonVariants } from "@/components/ui/button";
import { requireAnyAccessLevel } from "@/lib/auth-guards";
import { listConversations } from "@/lib/data/messages";
import { PAGE_SIZE, parsePage, type SearchParams } from "@/lib/pagination";

export const metadata: Metadata = { title: "Messages" };

export default async function MessagesPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const page = parsePage(await searchParams);
  const me = await requireAnyAccessLevel("student", "professional");
  const { conversations, total } = await listConversations({ page, pageSize: PAGE_SIZE });
  const isStudent = me.accessLevel === "student";

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <PageHeader title="Messages" description="A conversation opens when a professional accepts a request." />
      {conversations.length === 0 ? (
        <EmptyState
          title="No conversations yet"
          description={isStudent ? "Once a professional accepts your request, you can message each other here." : "Once you accept a student's request, you can message each other here."}
          action={
            <Link href={isStudent ? "/careers" : "/pro/requests"} className={buttonVariants({ size: "sm" })}>
              {isStudent ? "Browse careers" : "See requests"}
            </Link>
          }
        />
      ) : (
        <>
          <ConversationList conversations={conversations} meId={me.id} />
          <Pagination page={page} total={total} pageSize={PAGE_SIZE} />
        </>
      )}
    </div>
  );
}
