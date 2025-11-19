import type { FilterConfig } from "./types";
import type { Translator } from "./types";
import type { Doc } from "@/convex/_generated/dataModel";

/**
 * Creates filter configurations for programs table
 */
export function createProgramFilters(
  t: Translator,
  categories: Doc<"program_categories">[],
): FilterConfig[] {
  const categoryOptions = categories.map((cat) => ({
    value: cat._id,
    label: cat.name,
  }));

  return [
    {
      id: "type",
      label: t("filters.type"),
      type: "multi",
      options: [
        { value: "diploma", label: t("types.diploma") },
        { value: "bachelor", label: t("types.bachelor") },
        { value: "master", label: t("types.master") },
        { value: "doctorate", label: t("types.doctorate") },
      ],
    },
    {
      id: "categoryId",
      label: t("filters.category"),
      type: "multi",
      options: categoryOptions,
    },
    {
      id: "language",
      label: t("filters.language"),
      type: "multi",
      options: [
        { value: "es", label: t("languages.es") },
        { value: "en", label: t("languages.en") },
      ],
    },
    {
      id: "isActive",
      label: t("filters.status"),
      type: "multi",
      options: [
        { value: "true", label: t("statusValues.active") },
        { value: "false", label: t("statusValues.inactive") },
      ],
    },
  ];
}

/**
 * Creates filter configurations for courses table
 */
export function createCourseFilters(
  t: Translator,
  programs?: Array<{ _id: string; name: string }>,
): FilterConfig[] {
  const filters: FilterConfig[] = [
    {
      id: "category",
      label: t("filters.category"),
      type: "multi",
      options: [
        { value: "humanities", label: t("options.categories.humanities") },
        { value: "core", label: t("options.categories.core") },
        { value: "elective", label: t("options.categories.elective") },
        { value: "general", label: t("options.categories.general") },
      ],
    },
    {
      id: "isActive",
      label: t("filters.status"),
      type: "multi",
      options: [
        { value: "true", label: t("statusValues.active") },
        { value: "false", label: t("statusValues.inactive") },
      ],
    },
  ];

  // Add program filter if programs are provided
  if (programs && programs.length > 0) {
    const programOptions = programs.map((prog) => ({
      value: prog._id,
      label: prog.name,
    }));

    filters.unshift({
      id: "programId",
      label: t("filters.program"),
      type: "multi",
      options: programOptions,
    });
  }

  return filters;
}

/**
 * Creates filter configurations for students table
 */
export function createStudentFilters(t: Translator): FilterConfig[] {
  return [
    {
      id: "isActive",
      label: t("filters.status"),
      type: "multi",
      options: [
        { value: "true", label: t("statusValues.active") },
        { value: "false", label: t("statusValues.inactive") },
      ],
    },
  ];
}

/**
 * Helper to create filter function for multi-select filters
 */
export function createMultiSelectFilterFn<TData = unknown>() {
  return (row: any, columnId: string, filterValue: string[]): boolean => {
    if (!filterValue || filterValue.length === 0) return true;

    const cellValue = row.getValue(columnId);

    // Handle boolean values (for isActive)
    if (typeof cellValue === "boolean") {
      return filterValue.includes(String(cellValue));
    }

    // Handle string values
    return filterValue.includes(String(cellValue));
  };
}
