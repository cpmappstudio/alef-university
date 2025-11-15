import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";

import type { Doc } from "@/convex/_generated/dataModel";
import {
  buildSearchableField,
  renderLocalizedField,
} from "@/components/ui/localized-fields";
import type { Translator } from "@/lib/table/types";

type ProgramRow = Doc<"programs">;

export const programColumns = (
  t: Translator,
  locale: string,
  categoryLabels?: Record<string, string>,
): ColumnDef<ProgramRow>[] => {
  const emptyValue = t("columns.emptyValue");

  const typeLabels: Record<ProgramRow["type"], string> = {
    diploma: t("types.diploma"),
    bachelor: t("types.bachelor"),
    master: t("types.master"),
    doctorate: t("types.doctorate"),
  };

  const languageLabels: Record<ProgramRow["language"], string> = {
    es: t("languages.es"),
    en: t("languages.en"),
    both: t("languages.both"),
  };

  const programHeader = t("columns.program");

  return [
    {
      id: "code",
      accessorFn: (row) =>
        buildSearchableField(row, "codeEs", "codeEn", locale),
      header: t("columns.code"),
      cell: ({ row }) =>
        renderLocalizedField(
          row.original,
          "codeEs",
          "codeEn",
          locale,
          emptyValue,
        ),
    },
    {
      id: "program",
      accessorFn: (row) =>
        buildSearchableField(row, "nameEs", "nameEn", locale),
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          {programHeader}
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
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
      accessorKey: "type",
      header: t("columns.type"),
      cell: ({ row }) => {
        const value = row.getValue("type") as ProgramRow["type"] | undefined;
        return value ? (typeLabels[value] ?? emptyValue) : emptyValue;
      },
    },

    {
      accessorKey: "categoryId",

      header: t("columns.category"),

      cell: ({ row }) => {
        const categoryId = row.original.categoryId;
        if (!categoryId) {
          return emptyValue;
        }

        const categoryKey = String(categoryId);
        const categoryLabel = categoryLabels?.[categoryKey];

        if (categoryLabel && categoryLabel.trim()) {
          return categoryLabel.trim();
        }

        return categoryKey;
      },
    },

    {
      accessorKey: "language",
      header: t("columns.language"),
      cell: ({ row }) => {
        const value = row.getValue("language") as
          | ProgramRow["language"]
          | undefined;
        return value ? (languageLabels[value] ?? emptyValue) : emptyValue;
      },
    },
    {
      accessorKey: "totalCredits",
      header: () => <div className="text-right">{t("columns.credits")}</div>,
      cell: ({ row }) => {
        const value = row.getValue("totalCredits") as number | undefined;
        return (
          <div className="text-right font-medium">{value ?? emptyValue}</div>
        );
      },
    },
    {
      accessorKey: "durationBimesters",
      header: () => <div className="text-right">{t("columns.duration")}</div>,
      cell: ({ row }) => {
        const value = row.getValue("durationBimesters") as number | undefined;
        return (
          <div className="text-right font-medium">{value ?? emptyValue}</div>
        );
      },
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
