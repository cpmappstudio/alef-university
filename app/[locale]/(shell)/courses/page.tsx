/* Convex */
import { fetchQuery } from "convex/nextjs";
import { auth } from "@clerk/nextjs/server";
import { api } from "@/convex/_generated/api";

/* Components */
import { CourseManagementClient } from "@/components/course/course-management-client";

/* lib */
import type { CourseDocument } from "@/lib/courses/types";

export default async function CourseManagementPage() {
  const authData = await auth();
  const token = await authData.getToken({ template: "convex" });
  const fetchOptions = token ? { token } : undefined;

  const courses = ((await fetchQuery(
    api.courses.getAllCourses,
    {},
    fetchOptions,
  )) ?? []) as CourseDocument[];

  return <CourseManagementClient courses={courses} />;
}
