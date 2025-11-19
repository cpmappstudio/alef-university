"use client";

import { ColumnDef } from "@tanstack/react-table";
import type { Doc } from "@/convex/_generated/dataModel";
import type { Translator } from "@/lib/table/types";
import type { CourseRow } from "@/lib/courses/types";
import {
  createLocalizedCodeColumn,
  createLocalizedNameColumn,
  createStatusColumn,
  createMappedColumn,
  createSearchColumn,
} from "@/components/table/column-helpers";
import { Badge } from "@/components/ui/badge";
import { createMultiSelectFilterFn } from "@/lib/table/filter-configs";

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

// Columna de créditos - muestra el rango de créditos por programa
const createCreditsColumn = (
  t: Translator,
  emptyValue: string,
): ColumnDef<CourseRow> => ({
  id: "credits",
  header: t("columns.credits"),
  cell: ({ row }) => {
    const course = row.original;

    // Check if credits is directly on the course (from program-specific query)
    if (course.credits !== undefined) {
      return <span>{course.credits}</span>;
    }

    // Otherwise, check programs array (from general courses query)
    const programs = course.programs;

    if (!programs || programs.length === 0) {
      return <span className="text-muted-foreground">{emptyValue}</span>;
    }

    // Get all unique credit values from programs
    const uniqueCredits = new Set(programs.map((p) => p.credits));

    if (uniqueCredits.size === 1) {
      return <span>{Array.from(uniqueCredits)[0]}</span>;
    }

    // Show range of credits if they vary
    return (
      <div className="flex items-center gap-1">
        <span className="text-sm">
          {Array.from(uniqueCredits)
            .sort((a, b) => a - b)
            .join(", ")}
        </span>
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
  const multiSelectFilter = createMultiSelectFilterFn<CourseRow>();

  const columns: ColumnDef<CourseRow>[] = [
    {
      id: "search",
      accessorFn: (row) => {
        // Search by code and name
        const codeEs = row.codeEs || "";
        const codeEn = row.codeEn || "";
        const nameEs = row.nameEs || "";
        const nameEn = row.nameEn || "";
        const code = locale === "es" ? codeEs || codeEn : codeEn || codeEs;
        const name = locale === "es" ? nameEs || nameEn : nameEn || nameEs;

        // Add program names to search
        const programNames =
          row.programs && row.programs.length > 0
            ? row.programs.map((p) => p.name).join(" ")
            : "";

        return `${code} ${name} ${programNames}`.toLowerCase();
      },
      enableHiding: false,
      enableSorting: false,
      enableColumnFilter: true,
      meta: {
        filterOnly: true,
      },
    },
    createLocalizedCodeColumn(t, locale, emptyValue),
    createLocalizedNameColumn("name", t, locale, emptyValue, "columns.course"),
  ];

  if (includePrograms) {
    columns.push(createProgramsColumn(t, emptyValue));
  }

  columns.push(
    {
      ...createMappedColumn(
        "category",
        t,
        "columns.category",
        categoryLabels,
        emptyValue,
      ),
      filterFn: multiSelectFilter,
      enableColumnFilter: true,
    },
    createCreditsColumn(t, emptyValue),
    {
      ...createStatusColumn(t),
      filterFn: multiSelectFilter,
      enableColumnFilter: true,
    },
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
