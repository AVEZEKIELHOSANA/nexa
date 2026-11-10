"use server";

import { revalidatePath } from "next/cache";
import { assertAccessLevel } from "@/lib/auth-guards";
import { fail, ok, type ActionResult } from "@/lib/action";
import { isUuid } from "@/lib/pagination";
import { getCourse } from "@/lib/data/courses";
import { markCourseComplete } from "@/lib/data/progress";

/** A student marks a published course as completed. Doing it twice is harmless. */
export async function completeCourseAction(courseId: string): Promise<ActionResult> {
  try {
    const me = await assertAccessLevel("student");
    if (!isUuid(courseId)) throw new Error("Unknown course.");
    const course = await getCourse(courseId); // RLS: students only see published courses
    if (!course) throw new Error("This course is no longer available.");
    await markCourseComplete(me.id, courseId);
    revalidatePath("/courses");
    revalidatePath(`/courses/${courseId}`);
    revalidatePath("/student/learning");
    revalidatePath("/student");
    return ok();
  } catch (e) {
    return fail(e);
  }
}
