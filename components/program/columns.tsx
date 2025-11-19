import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Translator } from "@/lib/table/types";
import type { ProgramRow } from "@/lib/programs/types";
import {
  createLocalizedCodeColumn,
  createLocalizedNameColumn,
  createStatusColumn,
  createNumericColumn,
  createMappedColumn,
  createSearchColumn,
} from "@/components/table/column-helpers";
import { createMultiSelectFilterFn } from "@/lib/table/filter-configs";

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

  const multiSelectFilter = createMultiSelectFilterFn<ProgramRow>();

  return [
    createSearchColumn<ProgramRow>(locale, [
      { esKey: "codeEs", enKey: "codeEn" },
      { esKey: "nameEs", enKey: "nameEn" },
    ]),
    createLocalizedCodeColumn<ProgramRow>(t, locale, emptyValue),
    // Columna de nombre con ordenamiento (específica de programs)
    {
      id: "program",
      accessorFn: (row) =>
        `${row.nameEs || ""} ${row.nameEn || ""}`.trim().toLowerCase(),
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          {t("columns.program")}
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const nameEs = row.original.nameEs;
        const nameEn = row.original.nameEn;
        const name = locale === "es" ? nameEs || nameEn : nameEn || nameEs;
        return name || emptyValue;
      },
    },
    {
      ...createMappedColumn<ProgramRow>(
        "type",
        t,
        "columns.type",
        typeLabels,
        emptyValue,
      ),
      filterFn: multiSelectFilter,
      enableColumnFilter: true,
    },
    // Columna de categoría (específica por el categoryId)
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
      filterFn: multiSelectFilter,
      enableColumnFilter: true,
    },
    {
      ...createMappedColumn<ProgramRow>(
        "language",
        t,
        "columns.language",
        languageLabels,
        emptyValue,
      ),
      filterFn: multiSelectFilter,
      enableColumnFilter: true,
    },
    createNumericColumn<ProgramRow>(
      "totalCredits",
      t,
      "columns.credits",
      emptyValue,
    ),
    createNumericColumn<ProgramRow>(
      "durationBimesters",
      t,
      "columns.duration",
      emptyValue,
    ),
    {
      ...createStatusColumn<ProgramRow>(t),
      filterFn: multiSelectFilter,
      enableColumnFilter: true,
    },
  ];
};
