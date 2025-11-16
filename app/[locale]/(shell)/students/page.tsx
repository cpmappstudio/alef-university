/* Convex */
import { fetchQuery } from "convex/nextjs";
import { auth } from "@clerk/nextjs/server";
import { api } from "@/convex/_generated/api";

/* Components */
import { StudentManagementClient } from "@/components/student/student-management-client";

/* lib */
import type { StudentDocument } from "@/lib/students/types";

export default async function StudentManagementPage() {
  const authData = await auth();
  const token = await authData.getToken({ template: "convex" });
  const fetchOptions = token ? { token } : undefined;

  const students = ((await fetchQuery(
    api.users.getAllUsers,
    { role: "student" },
    fetchOptions,
  )) ?? []) as StudentDocument[];

  return <StudentManagementClient students={students} />;
}
