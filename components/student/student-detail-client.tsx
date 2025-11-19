"use client";

import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { ROUTES } from "@/lib/routes";
import type {
  StudentDetailClientProps,
  StudentDocument,
} from "@/lib/students/types";
import { exportStudentGradesToPDF } from "@/lib/export/export-student-grades-pdf";
import { buildStudentExportTranslations } from "@/lib/students/utils";

import { StudentFormDialog } from "@/components/student/student-form-dialog";
import { StudentDetailInfo } from "@/components/student/student-detail-info";
import { StudentDeleteDialog } from "@/components/student/student-delete-dialog";
import { Separator } from "@/components/ui/separator";
import CustomTable from "@/components/ui/custom-table";
import { studentGradeColumns } from "@/components/student/grade-columns";
import type { StudentGradeRow } from "@/components/student/grade-columns";

export function StudentDetailClient({
  studentId,
  initialStudent,
  initialProgram,
  userRole,
}: StudentDetailClientProps) {
  const locale = useLocale();
  const router = useRouter();
  const t = useTranslations("admin.students.detail");
  const tTable = useTranslations("admin.students.detail.table");
  const tExport = useTranslations("admin.students.detail.export");

  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);

  const studentQuery = useQuery(api.users.getUser, { userId: studentId });
  const student = (studentQuery ??
    initialStudent ??
    null) as StudentDocument | null;

  const programId = student?.studentProfile?.programId;
  const programQuery = useQuery(
    api.programs.getProgramById,
    programId ? { id: programId as Id<"programs"> } : "skip",
  );
  const program = programQuery ?? initialProgram ?? null;

  // Get student enrollments (grades)
  const enrollmentsQuery = useQuery(api.classes.getStudentEnrollments, {
    studentId,
  });
  const enrollments = enrollmentsQuery ?? [];

  const gradeColumns = React.useMemo(
    () => studentGradeColumns(tTable, locale),
    [tTable, locale],
  );

  const exportTranslations = buildStudentExportTranslations(tTable, tExport);

  const handleEdit = React.useCallback(() => {
    setIsEditDialogOpen(true);
  }, []);

  const handleDelete = React.useCallback(() => {
    setIsDeleteDialogOpen(true);
  }, []);

  const handleDeleteSuccess = React.useCallback(() => {
    router.push(ROUTES.students.root.withLocale(locale));
  }, [router, locale]);

  const handleExport = React.useCallback(
    (rows: StudentGradeRow[]) => {
      // Map the rows to include credits in the course object for PDF export
      const mappedGrades = rows.map((row) => ({
        ...row,
        course: row.course
          ? {
              ...row.course,
              credits: row.credits, // Credits from program_courses via class programId
            }
          : null,
      }));

      exportStudentGradesToPDF({
        student: {
          firstName: student?.firstName,
          lastName: student?.lastName,
          email: student?.email,
        },
        programName: program
          ? locale === "es"
            ? program.nameEs || program.nameEn
            : program.nameEn || program.nameEs
          : undefined,
        grades: mappedGrades,
        locale,
        translations: exportTranslations,
      });
    },
    [student, program, locale, exportTranslations],
  );

  if (!student) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-muted-foreground">{t("loading")}</p>
      </div>
    );
  }

  return (
    <>
      <StudentFormDialog
        mode="edit"
        student={student}
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
      />
      <StudentDeleteDialog
        studentId={student._id as Id<"users">}
        studentName={
          `${student.firstName ?? ""} ${student.lastName ?? ""}`.trim() ||
          student.email
        }
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onSuccess={handleDeleteSuccess}
      />

      <StudentDetailInfo
        student={student}
        program={program}
        onEdit={
          userRole === "admin" || userRole === "superadmin"
            ? handleEdit
            : undefined
        }
        onDelete={
          userRole === "admin" || userRole === "superadmin"
            ? handleDelete
            : () => {}
        }
        canDelete={userRole === "admin" || userRole === "superadmin"}
        userRole={userRole}
      />

      <Separator />

      <CustomTable
        columns={gradeColumns}
        data={enrollments}
        filterColumn="courseName"
        filterPlaceholder={t("filterCoursesPlaceholder")}
        columnsMenuLabel={t("columnsMenuLabel")}
        emptyMessage={t("emptyGradesMessage")}
        onExport={handleExport}
      />
    </>
  );
}
