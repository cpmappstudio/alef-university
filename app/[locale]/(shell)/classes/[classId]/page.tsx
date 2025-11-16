/* Convex */
import { fetchQuery } from "convex/nextjs";
import { auth } from "@clerk/nextjs/server";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

/* Components */
import { ClassDetailClient } from "@/components/class/class-detail-client";
import { notFound, redirect } from "next/navigation";
import type {
  ClassEnrollmentRow,
  ClassWithRelations,
} from "@/lib/classes/types";
import { getCurrentUserRole } from "@/lib/rbac";
import { ROUTES } from "@/lib/routes";

interface ClassDetailPageProps {
  params: Promise<{
    locale: string;
    classId: Id<"classes">;
  }>;
}

export default async function ClassDetailPage({
  params,
}: ClassDetailPageProps) {
  const { locale, classId } = await params;
  const authData = await auth();
  const { userId } = authData;
  const token = await authData.getToken({ template: "convex" });
  const fetchOptions = token ? { token } : undefined;

  const [classData, enrollments, userRole] = await Promise.all([
    fetchQuery(api.classes.getClassById, { id: classId }, fetchOptions),
    fetchQuery(api.classes.getClassEnrollments, { classId }, fetchOptions),
    getCurrentUserRole(),
  ]);

  if (!classData) {
    notFound();
  }

  // Professors can only view classes they are assigned to
  if (userRole === "professor" && userId) {
    // Get professor's Convex ID from Clerk ID
    const professor = await fetchQuery(
      api.users.getUserByClerkId,
      { clerkId: userId },
      fetchOptions,
    );

    // If professor doesn't exist or is not assigned to this class, redirect to their profile
    if (!professor || classData.professorId !== professor._id) {
      redirect(ROUTES.professors.details(userId).withLocale(locale));
    }
  }

  return (
    <ClassDetailClient
      classId={classId}
      initialClass={classData as ClassWithRelations}
      initialEnrollments={(enrollments ?? []) as ClassEnrollmentRow[]}
      userRole={userRole}
    />
  );
}
