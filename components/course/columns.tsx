"use client";

import { ColumnDef } from "@tanstack/react-table";
import type { Doc } from "@/convex/_generated/dataModel";
import {
  buildSearchableField,
  renderLocalizedField,
} from "@/components/ui/localized-fields";
import type { Translator } from "@/lib/table/types";

type CourseRow = Doc<"courses"> & {
  programs?: Array<{
    _id: string;
    codeEs: string;
    name: string;
  }>;
};

// Columns for course list page (with programs column)
export const courseColumnsWithPrograms = (
  t: Translator,
  locale: string,
): ColumnDef<CourseRow>[] => {
  const emptyValue = t("columns.emptyValue");

  const categoryLabels: Record<Doc<"courses">["category"], string> = {
    humanities: t("options.categories.humanities"),
    core: t("options.categories.core"),
    elective: t("options.categories.elective"),
    general: t("options.categories.general"),
  };

  return [
    {
      id: "code",
      accessorFn: (row) =>
        buildSearchableField(row, "codeEs", "codeEn", locale),
      header: t("columns.code"),
      cell: ({ row }) => (
        <span className="font-mono text-sm">
          {renderLocalizedField(
            row.original,
            "codeEs",
            "codeEn",
            locale,
            emptyValue,
          )}
        </span>
      ),
    },
    {
      id: "name",
      accessorFn: (row) =>
        buildSearchableField(row, "nameEs", "nameEn", locale),
      header: t("columns.course"),
      cell: ({ row }) =>
        renderLocalizedField(
          row.original,
          "nameEs",
          "nameEn",
          locale,
          emptyValue,
        ),
    },
    {
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
    },
    {
      accessorKey: "category",
      header: t("columns.category"),
      cell: ({ row }) => {
        const value = row.getValue("category") as
          | Doc<"courses">["category"]
          | undefined;
        return value ? (categoryLabels[value] ?? emptyValue) : emptyValue;
      },
    },
    {
      accessorKey: "credits",
      header: () => <div className="text-right">{t("columns.credits")}</div>,
      cell: ({ row }) => (
        <div className="text-right font-medium">{row.original.credits}</div>
      ),
    },
    {
      accessorKey: "isActive",
      header: t("columns.status"),
      cell: ({ row }) => (
        <span className="font-medium">
          {row.original.isActive ? t("status.active") : t("status.inactive")}
        </span>
      ),
    },
  ];
};

// Columns for program detail page (without programs column)
export const courseColumns = (
  t: Translator,
  locale: string,
): ColumnDef<Doc<"courses">>[] => {
  const emptyValue = t("columns.emptyValue");

  const categoryLabels: Record<Doc<"courses">["category"], string> = {
    humanities: t("options.categories.humanities"),
    core: t("options.categories.core"),
    elective: t("options.categories.elective"),
    general: t("options.categories.general"),
  };

  return [
    {
      id: "code",
      accessorFn: (row) =>
        buildSearchableField(row, "codeEs", "codeEn", locale),
      header: t("columns.code"),
      cell: ({ row }) => (
        <span className="font-mono text-sm">
          {renderLocalizedField(
            row.original,
            "codeEs",
            "codeEn",
            locale,
            emptyValue,
          )}
        </span>
      ),
    },
    {
      id: "name",
      accessorFn: (row) =>
        buildSearchableField(row, "nameEs", "nameEn", locale),
      header: t("columns.course"),
      cell: ({ row }) =>
        renderLocalizedField(
          row.original,
          "nameEs",
          "nameEn",
          locale,
          emptyValue,
        ),
    },
    {
      accessorKey: "category",
      header: t("columns.category"),
      cell: ({ row }) => {
        const value = row.getValue("category") as
          | Doc<"courses">["category"]
          | undefined;
        return value ? (categoryLabels[value] ?? emptyValue) : emptyValue;
      },
    },
    {
      accessorKey: "credits",
      header: () => <div className="text-right">{t("columns.credits")}</div>,
      cell: ({ row }) => (
        <div className="text-right font-medium">{row.original.credits}</div>
      ),
    },
    {
      accessorKey: "isActive",
      header: t("columns.status"),
      cell: ({ row }) => (
        <span className="font-medium">
          {row.original.isActive ? t("status.active") : t("status.inactive")}
        </span>
      ),
    },
  ];
};
