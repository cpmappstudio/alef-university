"use client";

import { ColumnDef } from "@tanstack/react-table";
import type { Translator } from "@/lib/table/types";
import type { Doc } from "@/convex/_generated/dataModel";
import { createCategoryLabels } from "@/lib/courses/utils";

export type StudentGradeRow = Doc<"class_enrollments"> & {
  course: Doc<"courses"> | null;
  bimester: Doc<"bimesters"> | null;
  class: Doc<"classes"> | null;
  credits?: number;
};

const createSearchColumn = (locale: string): ColumnDef<StudentGradeRow> => ({
  id: "search",
  accessorFn: (row) => {
    const course = row.course;
    if (!course) return "";

    const courseName =
      locale === "es"
        ? course.nameEs || course.nameEn
        : course.nameEn || course.nameEs;

    const courseCode =
      locale === "es"
        ? course.codeEs || course.codeEn
        : course.codeEn || course.codeEs;

    return `${courseName} ${courseCode}`.toLowerCase().trim();
  },
  enableHiding: false,
  enableSorting: false,
  enableColumnFilter: true,
  meta: {
    filterOnly: true,
  },
});

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

const createCategoryColumn = (
  t: Translator,
  tCourseForm: Translator,
  emptyValue: string,
): ColumnDef<StudentGradeRow> => ({
  id: "category",
  accessorFn: (row) => row.course?.category,
  header: t("columns.category"),
  cell: ({ row }) => {
    const course = row.original.course;
    if (!course || !course.category) return emptyValue;

    const categoryLabels = createCategoryLabels(tCourseForm);
    const label = categoryLabels[course.category] || course.category;

    return <span>{label}</span>;
  },
  meta: {
    exportable: false,
  },
});

interface StudentGradeColumnsOptions {
  showCategory?: boolean;
}

export const studentGradeColumns = (
  t: Translator,
  tCourseForm: Translator,
  locale: string,
  options: StudentGradeColumnsOptions = {},
): ColumnDef<StudentGradeRow>[] => {
  const { showCategory = true } = options;
  const emptyValue = t("columns.emptyValue");

  const columns: ColumnDef<StudentGradeRow>[] = [
    createSearchColumn(locale),
    createCourseCodeColumn(t, locale, emptyValue),
    createCourseNameColumn(t, locale, emptyValue),
  ];

  if (showCategory) {
    columns.push(createCategoryColumn(t, tCourseForm, emptyValue));
  }

  columns.push(
    createCreditsColumn(t, emptyValue),
    createPercentageGradeColumn(t, emptyValue),
    createLetterGradeColumn(t, emptyValue),
  );

  return columns;
};
