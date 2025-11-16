"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import type { Translator } from "@/lib/table/types";
import type { ClassEnrollmentRow } from "@/lib/classes/types";

const createStudentColumn = (
  t: Translator,
  emptyValue: string,
): ColumnDef<ClassEnrollmentRow> => ({
  accessorKey: "student",
  header: t("columns.student"),
  cell: ({ row }) => {
    const student = row.original.student;
    if (!student) return emptyValue;

    const fullName = [student.firstName, student.lastName]
      .filter(Boolean)
      .join(" ")
      .trim();

    return (
      <div className="flex flex-col">
        <span className="font-medium">{fullName || "-"}</span>
        <span className="text-xs text-muted-foreground">
          {student.email ?? ""}
        </span>
      </div>
    );
  },
});

const createStudentCodeColumn = (
  t: Translator,
  emptyValue: string,
): ColumnDef<ClassEnrollmentRow> => ({
  accessorKey: "studentCode",
  header: t("columns.studentCode"),
  cell: ({ row }) =>
    row.original.student?.studentProfile?.studentCode ?? emptyValue,
});

const createEnrollmentStatusColumn = (
  t: Translator,
): ColumnDef<ClassEnrollmentRow> => ({
  accessorKey: "status",
  header: t("columns.enrollmentStatus"),
  cell: ({ row }) => {
    const status = row.original.status ?? "enrolled";
    const variants: Record<
      string,
      "default" | "secondary" | "outline" | "destructive"
    > = {
      enrolled: "default",
      dropped: "secondary",
      withdrawn: "outline",
      completed: "default",
      incomplete: "destructive",
      failed: "destructive",
    };

    return (
      <Badge variant={variants[status] ?? "secondary"} className="text-xs">
        {t(`enrollmentStatusValues.${status}`)}
      </Badge>
    );
  },
});

const createPercentageGradeColumn = (
  t: Translator,
  emptyValue: string,
): ColumnDef<ClassEnrollmentRow> => ({
  accessorKey: "percentageGrade",
  header: () => (
    <div className="text-right">{t("columns.percentageGrade")}</div>
  ),
  cell: ({ row }) => {
    const grade = row.original.percentageGrade;
    return (
      <div className="text-right font-mono">
        {grade !== undefined && grade !== null ? `${grade}%` : emptyValue}
      </div>
    );
  },
});

const createLetterGradeColumn = (
  t: Translator,
  emptyValue: string,
): ColumnDef<ClassEnrollmentRow> => ({
  accessorKey: "letterGrade",
  header: () => <div className="text-center">{t("columns.letterGrade")}</div>,
  cell: ({ row }) => (
    <div className="text-center font-semibold">
      {row.original.letterGrade ?? emptyValue}
    </div>
  ),
});

const createGradePointsColumn = (
  t: Translator,
  emptyValue: string,
): ColumnDef<ClassEnrollmentRow> => ({
  accessorKey: "gradePoints",
  header: () => <div className="text-right">{t("columns.gradePoints")}</div>,
  cell: ({ row }) => {
    const points = row.original.gradePoints;
    return (
      <div className="text-right font-mono">
        {points !== undefined && points !== null
          ? points.toFixed(2)
          : emptyValue}
      </div>
    );
  },
});

export const classEnrollmentColumns = (
  t: Translator,
): ColumnDef<ClassEnrollmentRow>[] => {
  const emptyValue = t("columns.emptyValue");

  return [
    createStudentColumn(t, emptyValue),
    createStudentCodeColumn(t, emptyValue),
    createEnrollmentStatusColumn(t),
    createPercentageGradeColumn(t, emptyValue),
    createLetterGradeColumn(t, emptyValue),
    createGradePointsColumn(t, emptyValue),
  ];
};
