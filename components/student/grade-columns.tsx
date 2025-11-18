"use client";

import { ColumnDef } from "@tanstack/react-table";
import type { Translator } from "@/lib/table/types";
import type { Doc } from "@/convex/_generated/dataModel";

export type StudentGradeRow = Doc<"class_enrollments"> & {
  course: Doc<"courses"> | null;
  bimester: Doc<"bimesters"> | null;
  class: Doc<"classes"> | null;
  credits?: number;
};

const createCourseCodeColumn = (
  t: Translator,
  locale: string,
  emptyValue: string,
): ColumnDef<StudentGradeRow> => ({
  accessorKey: "courseCode",
  header: t("columns.courseCode"),
  cell: ({ row }) => {
    const course = row.original.course;
    if (!course) return emptyValue;

    const code =
      locale === "es"
        ? course.codeEs || course.codeEn
        : course.codeEn || course.codeEs;

    return <span className="font-medium">{code || emptyValue}</span>;
  },
});

const createCourseNameColumn = (
  t: Translator,
  locale: string,
  emptyValue: string,
): ColumnDef<StudentGradeRow> => ({
  accessorKey: "courseName",
  header: t("columns.courseName"),
  cell: ({ row }) => {
    const course = row.original.course;
    if (!course) return emptyValue;

    const name =
      locale === "es"
        ? course.nameEs || course.nameEn
        : course.nameEn || course.nameEs;

    return <span>{name || emptyValue}</span>;
  },
});

const createCreditsColumn = (
  t: Translator,
  emptyValue: string,
): ColumnDef<StudentGradeRow> => ({
  accessorKey: "credits",
  header: () => <div className="text-center">{t("columns.credits")}</div>,
  cell: ({ row }) => {
    // Credits come from program_courses association via class programId
    const credits = row.original.credits;

    return (
      <div className="text-center font-medium">
        {credits !== undefined && credits !== null ? credits : emptyValue}
      </div>
    );
  },
});

const createPercentageGradeColumn = (
  t: Translator,
  emptyValue: string,
): ColumnDef<StudentGradeRow> => ({
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
): ColumnDef<StudentGradeRow> => ({
  accessorKey: "letterGrade",
  header: () => <div className="text-center">{t("columns.letterGrade")}</div>,
  cell: ({ row }) => {
    const letterGrade = row.original.letterGrade;
    return (
      <div className="text-center font-semibold text-lg">
        {letterGrade || emptyValue}
      </div>
    );
  },
});

export const studentGradeColumns = (
  t: Translator,
  locale: string,
): ColumnDef<StudentGradeRow>[] => {
  const emptyValue = t("columns.emptyValue");

  return [
    createCourseCodeColumn(t, locale, emptyValue),
    createCourseNameColumn(t, locale, emptyValue),
    createCreditsColumn(t, emptyValue),
    createPercentageGradeColumn(t, emptyValue),
    createLetterGradeColumn(t, emptyValue),
  ];
};
