import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Pagination } from "@/components/pagination";
import { StatCard } from "@/components/stat-card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { countPublishedCourses, listCompletedCourses } from "@/lib/data/progress";
import { formatDate } from "@/lib/format";
import { parsePage, type SearchParams } from "@/lib/pagination";

export const metadata: Metadata = { title: "My learning" };

const SIZE = 20;

export default async function LearningPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const page = parsePage(await searchParams);
  const [{ items, total }, published] = await Promise.all([listCompletedCourses({ page, pageSize: SIZE }), countPublishedCourses()]);
  const percent = published === 0 ? 0 : Math.min(100, Math.round((total / published) * 100));

  return (
    <>
      <PageHeader title="My learning" description="The courses you have completed." actions={<Link href="/courses" className={buttonVariants({ variant: "outline" })}>Browse courses</Link>} />
      <div className="space-y-6">
        <div className="grid gap-3 sm:grid-cols-3">
          <StatCard label="Completed" value={total} icon={CheckCircle2} />
          <StatCard label="Available" value={published} href="/courses" />
          <Card className="p-4 sm:col-span-1">
            <p className="text-sm text-muted-foreground">Progress</p>
            <p className="mt-2 text-3xl font-semibold tabular-nums">{percent}%</p>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} aria-label="Courses completed">
              <div className="h-full rounded-full bg-primary" style={{ width: `${percent}%` }} />
            </div>
          </Card>
        </div>

        {items.length === 0 ? (
          <EmptyState title="Nothing completed yet" description="Open a course, read it, and press “Mark as complete”. It will show up here." action={<Link href="/courses" className={buttonVariants()}>Find a course</Link>} />
        ) : (
          <ul className="divide-y rounded-lg border">
            {items.map((c) => (
              <li key={c.courseId}>
                <Link href={`student/courses/${c.courseId}`} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 hover:bg-muted/40">
                  <div className="space-y-1">
                    <p className="font-medium">{c.title}</p>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      {c.topic && <Badge tone="info">{c.topic}</Badge>}
                      {c.estimatedMinutes && <span>{c.estimatedMinutes} min</span>}
                    </div>
                  </div>
                  <Badge tone="success">Completed {formatDate(c.completedAt)}</Badge>
                </Link>
              </li>
            ))}
          </ul>
        )}
        <Pagination page={page} total={total} pageSize={SIZE} />
      </div>
    </>
  );
}
