/* Convex */
import { fetchQuery } from "convex/nextjs";
import { auth } from "@clerk/nextjs/server";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

/* Components */
import { StudentDetailClient } from "@/components/student/student-detail-client";
import { notFound } from "next/navigation";

interface StudentDetailPageProps {
  params: Promise<{
    studentId: Id<"users">;
  }>;
}

export default async function StudentDetailPage({
  params,
}: StudentDetailPageProps) {
  const { studentId } = await params;
  const authData = await auth();
  const token = await authData.getToken({ template: "convex" });
  const fetchOptions = token ? { token } : undefined;

  const student = await fetchQuery(
    api.users.getUser,
    { userId: studentId },
    fetchOptions,
  );

  if (!student) {
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
      studentId={studentId}
      initialStudent={student}
      initialProgram={program}
    />
  );
}
