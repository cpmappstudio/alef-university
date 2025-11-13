import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";

import type { Doc } from "@/convex/_generated/dataModel";

type ProgramRow = Doc<"programs">;
type Translator = (key: string, values?: Record<string, any>) => string;

const LANGUAGE_TAGS = {
  es: "ES",
  en: "EN",
} as const;

const getStringValue = <T extends keyof ProgramRow>(
  row: ProgramRow,
  key: T,
): string => {
  const value = row[key];
  return typeof value === "string" ? value.trim() : "";
};

const pickPreferredValue = (
  primary: string,
  fallback: string,
): string | null => {
  if (primary) {
    return primary;
  }
  if (fallback) {
    return fallback;
  }
  return null;
};

const renderLocalizedField = (
  row: ProgramRow,
  esKey: keyof ProgramRow,
  enKey: keyof ProgramRow,
  locale: string,
  emptyValue: string,
) => {
  const valueEs = getStringValue(row, esKey);
  const valueEn = getStringValue(row, enKey);

  if (row.language === "both") {
    const items: Array<{ tag: string; value: string }> = [];

    if (locale === "en") {
      if (valueEn) {
        items.push({ tag: LANGUAGE_TAGS.en, value: valueEn });
      }
      if (valueEs) {
        items.push({ tag: LANGUAGE_TAGS.es, value: valueEs });
      }
    } else {
      if (valueEs) {
        items.push({ tag: LANGUAGE_TAGS.es, value: valueEs });
      }
      if (valueEn) {
        items.push({ tag: LANGUAGE_TAGS.en, value: valueEn });
      }
    }

    if (!items.length) {
      return emptyValue;
    }

    return (
      <div className="flex flex-col gap-0.5">
        {items.map(({ tag, value }) => (
          <span key={tag}>
            <span className="font-semibold">{tag}:</span> {value}
          </span>
        ))}
      </div>
    );
  }

  if (row.language === "en") {
    const preferredValue = getStringValue(row, enKey);
    const fallbackValue = getStringValue(row, esKey);
    return pickPreferredValue(preferredValue, fallbackValue) ?? emptyValue;
  }

  const preferredValue = getStringValue(row, esKey);
  const fallbackValue = getStringValue(row, enKey);
  return pickPreferredValue(preferredValue, fallbackValue) ?? emptyValue;
};

const formatLocalizedFieldForCopy = (
  row: ProgramRow,
  esKey: keyof ProgramRow,
  enKey: keyof ProgramRow,
  locale: string,
): string => {
  const valueEs = getStringValue(row, esKey);
  const valueEn = getStringValue(row, enKey);

  if (row.language === "both") {
    const parts: string[] = [];

    if (locale === "en") {
      if (valueEn) {
        parts.push(`${LANGUAGE_TAGS.en}: ${valueEn}`);
      }
      if (valueEs) {
        parts.push(`${LANGUAGE_TAGS.es}: ${valueEs}`);
      }
    } else {
      if (valueEs) {
        parts.push(`${LANGUAGE_TAGS.es}: ${valueEs}`);
      }
      if (valueEn) {
        parts.push(`${LANGUAGE_TAGS.en}: ${valueEn}`);
      }
    }

    return parts.join("\n");
  }

  if (row.language === "en") {
    return pickPreferredValue(valueEn, valueEs) ?? "";
  }

  return pickPreferredValue(valueEs, valueEn) ?? "";
};

const buildSearchableField = (
  row: ProgramRow,
  esKey: keyof ProgramRow,
  enKey: keyof ProgramRow,
  locale: string,
): string => {
  const valueEs = getStringValue(row, esKey);
  const valueEn = getStringValue(row, enKey);

  if (row.language === "both") {
    const parts: string[] = [];

    if (locale === "en") {
      if (valueEn) {
        parts.push(`${LANGUAGE_TAGS.en}: ${valueEn}`);
      }
      if (valueEs) {
        parts.push(`${LANGUAGE_TAGS.es}: ${valueEs}`);
      }
    } else {
      if (valueEs) {
        parts.push(`${LANGUAGE_TAGS.es}: ${valueEs}`);
      }
      if (valueEn) {
        parts.push(`${LANGUAGE_TAGS.en}: ${valueEn}`);
      }
    }

    return parts.join(" ");
  }

  if (row.language === "en") {
    return (
      pickPreferredValue(
        getStringValue(row, enKey),
        getStringValue(row, esKey),
      ) ?? ""
    );
  }

  return (
    pickPreferredValue(
      getStringValue(row, esKey),
      getStringValue(row, enKey),
    ) ?? ""
  );
};

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
