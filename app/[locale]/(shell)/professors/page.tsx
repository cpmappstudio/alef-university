/* Convex */
import { fetchQuery } from "convex/nextjs";
import { auth } from "@clerk/nextjs/server";
import { api } from "@/convex/_generated/api";

/* Components */
import { ProfessorManagementClient } from "@/components/professor/professor-management-client";

/* lib */
import type { ProfessorDocument } from "@/lib/professors/types";

export default async function ProfessorManagementPage() {
  const authData = await auth();
  const token = await authData.getToken({ template: "convex" });
  const fetchOptions = token ? { token } : undefined;

  const professors = ((await fetchQuery(
    api.admin.getAllUsers,
    { role: "professor" },
    fetchOptions,
  )) ?? []) as ProfessorDocument[];

  return <ProfessorManagementClient professors={professors} />;
}
