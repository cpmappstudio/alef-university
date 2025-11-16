/* Convex */
import { fetchQuery } from "convex/nextjs";
import { auth } from "@clerk/nextjs/server";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

/* Components */
import { ProfessorDetailClient } from "@/components/professor/professor-detail-client";
import { notFound, redirect } from "next/navigation";

/* lib */
import type { ProfessorClassRow } from "@/lib/professors/types";
import { getCurrentUserRole } from "@/lib/rbac";
import { ROUTES } from "@/lib/routes";

interface ProfessorDetailPageProps {
  params: Promise<{
    locale: string;
    professorId: string;
  }>;
}

export default async function ProfessorDetailPage({
  params,
}: ProfessorDetailPageProps) {
  const { locale, professorId } = await params;
  const authData = await auth();
  const { userId } = authData;
  const userRole = await getCurrentUserRole();

  // Professors can only view their own profile
  if (userRole === "professor" && userId && userId !== professorId) {
    redirect(ROUTES.professors.details(userId).withLocale(locale));
  }

  const token = await authData.getToken({ template: "convex" });
  const fetchOptions = token ? { token } : undefined;

  const professor = await fetchQuery(
    api.users.getUserByClerkId,
    { clerkId: professorId },
    fetchOptions,
  );

  if (!professor) {
    notFound();
  }

  // Additional check: ensure we have a valid Convex ID
  if (!professor._id) {
    notFound();
  }

  const classes = await fetchQuery(
    api.classes.getClassesByProfessor,
    { professorId: professor._id as Id<"users"> },
    fetchOptions,
  );

  return (
    <ProfessorDetailClient
      professorId={professor._id as Id<"users">}
      initialProfessor={professor}
      initialClasses={(classes ?? []) as ProfessorClassRow[]}
      userRole={userRole}
    />
  );
}
