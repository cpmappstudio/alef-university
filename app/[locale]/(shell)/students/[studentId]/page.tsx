/* Convex */
import { fetchQuery } from "convex/nextjs";
import { auth } from "@clerk/nextjs/server";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

/* Components */
import { StudentDetailClient } from "@/components/student/student-detail-client";
import { notFound, redirect } from "next/navigation";
import { getCurrentUserRole } from "@/lib/rbac";
import { ROUTES } from "@/lib/routes";
import type { UserRole } from "@/convex/types";

interface StudentDetailPageProps {
  params: Promise<{
    locale: string;
    studentId: string;
  }>;
}

export default async function StudentDetailPage({
  params,
}: StudentDetailPageProps) {
  const { locale, studentId } = await params;
  const authData = await auth();
  const { userId } = authData;
  const userRole = await getCurrentUserRole();

  // Students can only view their own profile
  if (userRole === "student" && userId && userId !== studentId) {
    redirect(ROUTES.students.details(userId).withLocale(locale));
  }

  const token = await authData.getToken({ template: "convex" });
  const fetchOptions = token ? { token } : undefined;

  const student = await fetchQuery(
    api.users.getUserByClerkId,
    { clerkId: studentId },
    fetchOptions,
  );

  if (!student) {
    notFound();
  }

  // Additional check: ensure we have a valid Convex ID
  if (!student._id) {
    notFound();
  }

  let program = null;
  const programId = student.studentProfile?.programId;
  if (programId) {
    program = await fetchQuery(
      api.programs.getProgramById,
      { id: programId },
      fetchOptions,
    );
  }

  return (
    <StudentDetailClient
      studentId={student?._id as Id<"users">}
      initialStudent={student}
      initialProgram={program}
      userRole={userRole as UserRole}
    />
  );
}
