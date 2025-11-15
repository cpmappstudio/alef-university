// ################################################################################
// # File: page.tsx                                                               #
// # Check: 11/15/2025                                                            #
// ################################################################################

/* Convex */
import { fetchQuery } from "convex/nextjs";
import { auth } from "@clerk/nextjs/server";
import { api } from "@/convex/_generated/api";

/* Components */
import ProgramManagementClient from "@/components/program/program-management-client";

export default async function ProgramManagementPage() {
  const authData = await auth();
  const token = await authData.getToken({ template: "convex" });
  const fetchOptions = token ? { token } : undefined;

  const [programs, categories] = await Promise.all([
    fetchQuery(api.programs.getAllPrograms, {}, fetchOptions),
    fetchQuery(api.programs.getProgramCategories, {}, fetchOptions),
  ]);

  return (
    <ProgramManagementClient
      programs={programs ?? []}
      categories={categories ?? []}
    />
  );
}
