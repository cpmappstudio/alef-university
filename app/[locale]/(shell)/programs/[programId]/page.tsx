// ################################################################################
// # File: page.tsx                                                               #
// # Check: 11/15/2025                                                            #
// ################################################################################

/* Convex */
import type { Id } from "@/convex/_generated/dataModel";

/* Components */
import ProgramDetailClient from "@/components/program/program-detail-client";

interface ProgramDetailPageProps {
  params: {
    programId: Id<"programs">;
  };
}

export default async function ProgramDetailPage({
  params,
}: ProgramDetailPageProps) {
  return <ProgramDetailClient programId={params.programId} />;
}
