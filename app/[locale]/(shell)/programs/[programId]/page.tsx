/* Convex */
import { fetchQuery } from "convex/nextjs";
import { auth } from "@clerk/nextjs/server";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

/* Components */
import ProgramDetailClient from "@/components/program/program-detail-client";
import { notFound } from "next/navigation";

interface ProgramDetailPageProps {
  params: Promise<{
    programId: Id<"programs">;
  }>;
}

export default async function ProgramDetailPage({
  params,
}: ProgramDetailPageProps) {
  const { programId } = await params;
  const authData = await auth();
  const token = await authData.getToken({ template: "convex" });
  const fetchOptions = token ? { token } : undefined;

  const [program, courses, categories] = await Promise.all([
    fetchQuery(api.programs.getProgramById, { id: programId }, fetchOptions),
    fetchQuery(api.courses.getCoursesByProgram, { programId }, fetchOptions),
    fetchQuery(api.programs.getProgramCategories, {}, fetchOptions),
  ]);

  if (!program) {
    notFound();
  }

  return (
    <ProgramDetailClient
      programId={programId}
      initialProgram={program}
      initialCourses={courses ?? []}
      initialCategories={categories ?? []}
    />
  );
}
