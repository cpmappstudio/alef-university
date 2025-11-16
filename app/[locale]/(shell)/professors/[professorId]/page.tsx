/* Convex */
import { fetchQuery } from "convex/nextjs";
import { auth } from "@clerk/nextjs/server";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

/* Components */
import { ProfessorDetailClient } from "@/components/professor/professor-detail-client";
import { notFound } from "next/navigation";

/* lib */
import type { ProfessorClassRow } from "@/lib/professors/types";

interface ProfessorDetailPageProps {
  params: Promise<{
    professorId: Id<"users">;
  }>;
}

export default async function ProfessorDetailPage({
  params,
}: ProfessorDetailPageProps) {
  const { professorId } = await params;
  const authData = await auth();
  const token = await authData.getToken({ template: "convex" });
  const fetchOptions = token ? { token } : undefined;

  const [professor, classes] = await Promise.all([
    fetchQuery(api.users.getUser, { userId: professorId }, fetchOptions),
    fetchQuery(
      api.classes.getClassesByProfessor,
      { professorId },
      fetchOptions,
    ),
  ]);

  if (!professor) {
    notFound();
  }

  return (
    <ProfessorDetailClient
      professorId={professorId}
      initialProfessor={professor}
      initialClasses={(classes ?? []) as ProfessorClassRow[]}
    />
  );
}
