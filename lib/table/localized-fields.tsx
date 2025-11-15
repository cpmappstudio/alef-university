import * as React from "react";

type Language = "es" | "en" | "both";

export type Translator = (
  key: string,
  values?: Record<string, unknown>,
) => string;

const LANGUAGE_TAGS: Record<Exclude<Language, "both">, string> = {
  es: "ES",
  en: "EN",
};

type LocalizedRow = {
  language?: Language;
};

const getStringValue = <
  Row extends Record<string, unknown>,
  Key extends keyof Row,
>(
  row: Row,
  key: Key,
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

export function renderLocalizedField<Row extends LocalizedRow>(
  row: Row,
  esKey: keyof Row,
  enKey: keyof Row,
  locale: string,
  emptyValue: string,
): React.ReactNode {
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
}

export function buildSearchableField<Row extends LocalizedRow>(
  row: Row,
  esKey: keyof Row,
  enKey: keyof Row,
  locale: string,
): string {
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
}
