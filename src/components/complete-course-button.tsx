"use client";

import { useTransition } from "react";
import { CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { completeCourseAction } from "@/lib/actions/courses";

export function CompleteCourseButton({ courseId }: { courseId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const r = await completeCourseAction(courseId);
          if (!r.ok) {
            toast.error(r.error);
            return;
          }
          toast.success("Course completed. Well done!");
        })
      }
    >
      <CheckCircle2 className="h-4 w-4" aria-hidden /> {pending ? "Saving…" : "Mark as complete"}
    </Button>
  );
}
