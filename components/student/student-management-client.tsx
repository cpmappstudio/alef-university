"use client";

import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";

import { api } from "@/convex/_generated/api";
import type {
  StudentDocument,
  StudentManagementClientProps,
} from "@/lib/students/types";
import { ROUTES } from "@/lib/routes";
import { exportStudentsToJSONL } from "@/lib/students/utils";

import { studentColumns } from "@/components/student/columns";
import { StudentActions } from "@/components/student/student-actions";
import CustomTable from "@/components/ui/custom-table";
import { Separator } from "@/components/ui/separator";

export function StudentManagementClient({
  students,
}: StudentManagementClientProps) {
  const t = useTranslations("admin.students.table");
  const locale = useLocale();
  const router = useRouter();

  const liveStudents = useQuery(api.users.getAllUsers, {
    role: "student",
  });
  const programs = useQuery(api.programs.getAllPrograms, { isActive: true });

  const programLabels = React.useMemo(() => {
    if (!programs) return {};
    return programs.reduce<Record<string, string>>((acc, program) => {
      const label =
        locale === "es"
          ? program.nameEs || program.nameEn || ""
          : program.nameEn || program.nameEs || "";
      acc[program._id] = label;
      return acc;
    }, {});
  }, [programs, locale]);

  const tableData = React.useMemo(
    () => liveStudents ?? students,
    [liveStudents, students],
  );

  const columns = React.useMemo(
    () => studentColumns(t, programLabels),
    [t, programLabels],
  );

  const handleRowClick = React.useCallback(
    (student: StudentDocument) => {
      router.push(ROUTES.students.details(student.clerkId).withLocale(locale));
    },
    [router, locale],
  );

  const handleExport = React.useCallback(
    (rows: StudentDocument[]) => {
      if (!programs || programs.length === 0) {
        console.error("No programs available for export");
        return;
      }

      exportStudentsToJSONL(rows, programs, locale);
    },
    [programs, locale],
  );

  return (
    <>
      <StudentActions />
      <Separator />
      <CustomTable
        columns={columns}
        data={tableData}
        filterColumn="name"
        filterPlaceholder={t("filterPlaceholder")}
        columnsMenuLabel={t("columnsMenuLabel")}
        emptyMessage={t("emptyMessage")}
        onRowClick={handleRowClick}
        onExport={handleExport}
      />
    </>
  );
}
