import type { FilterConfig, Translator } from "@/lib/table/types";
import type { LibraryBookRecord } from "@/lib/library/types";

const MAX_CATEGORY_FILTER_OPTIONS = 20;

function toOptionLabel(value: string): string {
  return value
    .split(/\s+/)
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(" ");
}

export function createLibraryFilters(
  t: Translator,
  books: LibraryBookRecord[],
): FilterConfig[] {
  const languages = new Set<string>();
  const categories = new Set<string>();

  for (const book of books) {
    const language = (book.language ?? "").trim().toLowerCase();
    if (language) {
      languages.add(language);
    }

    for (const category of book.categories) {
      const normalizedCategory = category.trim();
      if (normalizedCategory) {
        categories.add(normalizedCategory);
      }
    }
  }

  const languageOptions = Array.from(languages)
    .sort((a, b) => a.localeCompare(b))
    .map((language) => {
      if (language === "es") {
        return {
          value: "es",
          label: t("filters.languageValues.es"),
        };
      }

      if (language === "en") {
        return {
          value: "en",
          label: t("filters.languageValues.en"),
        };
      }

      return {
        value: language,
        label: toOptionLabel(language),
      };
    });

  const categoryOptions = Array.from(categories)
    .sort((a, b) => a.localeCompare(b))
    .slice(0, MAX_CATEGORY_FILTER_OPTIONS)
    .map((category) => ({
      value: category,
      label: category,
    }));

  const filters: FilterConfig[] = [
    {
      id: "status",
      label: t("filters.status"),
      type: "multi",
      options: [
        {
          value: "ok",
          label: t("filters.statusValues.ok"),
        },
        {
          value: "needs_review",
          label: t("filters.statusValues.needs_review"),
        },
        {
          value: "failed",
          label: t("filters.statusValues.failed"),
        },
      ],
    },
  ];

  if (languageOptions.length > 0) {
    filters.push({
      id: "language",
      label: t("filters.language"),
      type: "multi",
      options: languageOptions,
    });
  }

  if (categoryOptions.length > 0) {
    filters.push({
      id: "category",
      label: t("filters.category"),
      type: "multi",
      options: categoryOptions,
    });
  }

  return filters;
}
