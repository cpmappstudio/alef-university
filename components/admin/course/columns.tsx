"use client";

import { ColumnDef } from "@tanstack/react-table";
import type { Doc } from "@/convex/_generated/dataModel";

type CourseRow = Doc<"courses">;
type Translator = (key: string, values?: Record<string, any>) => string;

const LANGUAGE_TAGS = {
  es: "ES",
  en: "EN",
} as const;

const getStringValue = <T extends keyof CourseRow>(
  row: CourseRow,
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
  row: CourseRow,
  esKey: keyof CourseRow,
  enKey: keyof CourseRow,
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

const buildSearchableField = (
  row: CourseRow,
  esKey: keyof CourseRow,
  enKey: keyof CourseRow,
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

export const courseColumns = (
  t: Translator,
  locale: string,
): ColumnDef<CourseRow>[] => {
  const emptyValue = t("columns.emptyValue");

  const categoryLabels: Record<CourseRow["category"], string> = {
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
          | CourseRow["category"]
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
