import Link from "next/link";
import { CheckCircle2, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Course } from "@/lib/data/courses";

/** CourseCard: title, topic, estimated time, "Completed" badge. The whole card is a link. */
export function CourseCard({ course, completed = false }: { course: Pick<Course, "id" | "title" | "topic" | "content" | "estimatedMinutes">; completed?: boolean }) {
  const summary = (course.content ?? "").replace(/^#+\s*/gm, "").replace(/\s+/g, " ").trim();
  return (
    <Link href={`/student/courses/${course.id}`} className="group block h-full rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      <Card className="h-full transition-colors group-hover:border-primary">
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            {course.topic && <Badge tone="info">{course.topic}</Badge>}
            {completed && (
              <Badge tone="success" className="gap-1">
                <CheckCircle2 className="h-3 w-3" aria-hidden /> Completed
              </Badge>
            )}
          </div>
          <CardTitle className="[overflow-wrap:anywhere]">{course.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {summary && <p className="line-clamp-3 text-sm text-muted-foreground">{summary}</p>}
          {course.estimatedMinutes && (
            <p className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Clock className="h-3.5 w-3.5" aria-hidden /> {course.estimatedMinutes} min
            </p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
