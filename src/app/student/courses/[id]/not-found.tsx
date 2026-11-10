import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { buttonVariants } from "@/components/ui/button";

export default function CourseNotFound() {
  return <EmptyState title="Course not found" description="It may have been removed or is not published yet." action={<Link href="/courses" className={buttonVariants({ variant: "outline" })}>Back to courses</Link>} />;
}
