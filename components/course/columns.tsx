"use client";

import { ColumnDef } from "@tanstack/react-table";
import type { Doc } from "@/convex/_generated/dataModel";
import type { Translator } from "@/lib/table/types";
import type { CourseRow } from "@/lib/courses/types";
import {
  createLocalizedCodeColumn,
  createLocalizedNameColumn,
  createStatusColumn,
  createNumericColumn,
  createMappedColumn,
} from "@/components/table/column-helpers";

const createCategoryLabels = (
  t: Translator,
): Record<Doc<"courses">["category"], string> => ({
  humanities: t("options.categories.humanities"),
  core: t("options.categories.core"),
  elective: t("options.categories.elective"),
  general: t("options.categories.general"),
});

// Columna de programas (específica de courses)
const createProgramsColumn = (
  t: Translator,
  emptyValue: string,
): ColumnDef<CourseRow> => ({
  id: "programs",
  accessorFn: (row) => {
    if (!row.programs || row.programs.length === 0) return "";
    return row.programs.map((p) => p.name).join(", ");
  },
  header: t("columns.programs"),
  cell: ({ row }) => {
    const programs = row.original.programs;
    if (!programs || programs.length === 0) {
      return <span className="text-muted-foreground">{emptyValue}</span>;
    }
    return (
      <div className="flex flex-col gap-0.5">
        {programs.map((program) => (
          <span key={program._id} className="text-sm">
            {program.name}
          </span>
        ))}
      </div>
    );
  },
});

const createCourseColumns = (
  t: Translator,
  locale: string,
  includePrograms: boolean,
): ColumnDef<CourseRow>[] => {
  const emptyValue = t("columns.emptyValue");
  const categoryLabels = createCategoryLabels(t);

  const columns: ColumnDef<CourseRow>[] = [
    createLocalizedCodeColumn(t, locale, emptyValue),
    createLocalizedNameColumn("name", t, locale, emptyValue, "columns.course"),
  ];

  if (includePrograms) {
    columns.push(createProgramsColumn(t, emptyValue));
  }

  columns.push(
    createMappedColumn(
      "category",
      t,
      "columns.category",
      categoryLabels,
      emptyValue,
    ),
    createNumericColumn("credits", t, "columns.credits", emptyValue),
    createStatusColumn(t),
  );

  return columns;
};

export const courseColumnsWithPrograms = (
  t: Translator,
  locale: string,
): ColumnDef<CourseRow>[] => createCourseColumns(t, locale, true);

export const courseColumns = (
  t: Translator,
  locale: string,
): ColumnDef<Doc<"courses">>[] =>
  createCourseColumns(t, locale, false) as ColumnDef<Doc<"courses">>[];
