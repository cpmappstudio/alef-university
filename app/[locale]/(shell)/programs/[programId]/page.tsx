/* Convex */
import { fetchQuery } from "convex/nextjs";
import { auth } from "@clerk/nextjs/server";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

/* Components */
import ProgramDetailClient from "@/components/program/program-detail-client";
import { notFound } from "next/navigation";

interface ProgramDetailPageProps {
  params: {
    programId: Id<"programs">;
  };
}

export default async function ProgramDetailPage({
  params,
}: ProgramDetailPageProps) {
  const authData = await auth();
  const token = await authData.getToken({ template: "convex" });
  const fetchOptions = token ? { token } : undefined;

  const [program, courses, categories] = await Promise.all([
    fetchQuery(
      api.programs.getProgramById,
      { id: params.programId },
      fetchOptions,
    ),
    fetchQuery(
      api.courses.getCoursesByProgram,
      { programId: params.programId },
      fetchOptions,
    ),
    fetchQuery(api.programs.getProgramCategories, {}, fetchOptions),
  ]);

  if (!program) {
    notFound();
  }

  return (
    <ProgramDetailClient
      programId={params.programId}
      initialProgram={program}
      initialCourses={courses ?? []}
      initialCategories={categories ?? []}
    />
  );
}
