/* Convex */
import { fetchQuery } from "convex/nextjs";
import { auth } from "@clerk/nextjs/server";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

/* Components */
import { ClassDetailClient } from "@/components/class/class-detail-client";
import { notFound } from "next/navigation";
import type {
  ClassEnrollmentRow,
  ClassWithRelations,
} from "@/lib/classes/types";

interface ClassDetailPageProps {
  params: {
    classId: Id<"classes">;
  };
}

export default async function ClassDetailPage({
  params,
}: ClassDetailPageProps) {
  const authData = await auth();
  const token = await authData.getToken({ template: "convex" });
  const fetchOptions = token ? { token } : undefined;

  const [classData, enrollments] = await Promise.all([
    fetchQuery(api.classes.getClassById, { id: params.classId }, fetchOptions),
    fetchQuery(
      api.classes.getClassEnrollments,
      { classId: params.classId },
      fetchOptions,
    ),
  ]);

  if (!classData) {
    notFound();
  }

  return (
    <ClassDetailClient
      classId={params.classId}
      initialClass={classData as ClassWithRelations}
      initialEnrollments={(enrollments ?? []) as ClassEnrollmentRow[]}
    />
  );
}
