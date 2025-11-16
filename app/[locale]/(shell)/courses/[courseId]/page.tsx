/* Convex */
import { fetchQuery } from "convex/nextjs";
import { auth } from "@clerk/nextjs/server";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

/* Components */
import { CourseDetailClient } from "@/components/course/course-detail-client";
import { notFound } from "next/navigation";
import type { CourseClassRow } from "@/lib/courses/types";

interface CourseDetailPageProps {
  params: {
    courseId: Id<"courses">;
  };
}

export default async function CourseDetailPage({
  params,
}: CourseDetailPageProps) {
  const authData = await auth();
  const token = await authData.getToken({ template: "convex" });
  const fetchOptions = token ? { token } : undefined;

  const [course, classes, programs] = await Promise.all([
    fetchQuery(
      api.courses.getCourseById,
      { id: params.courseId },
      fetchOptions,
    ),
    fetchQuery(
      api.classes.getClassesByCourse,
      { courseId: params.courseId },
      fetchOptions,
    ),
    fetchQuery(
      api.programs.getProgramsByCourse,
      { courseId: params.courseId },
      fetchOptions,
    ),
  ]);

  if (!course) {
    notFound();
  }

  return (
    <CourseDetailClient
      courseId={params.courseId}
      initialCourse={course}
      initialClasses={(classes ?? []) as CourseClassRow[]}
      initialPrograms={programs ?? []}
    />
  );
}
