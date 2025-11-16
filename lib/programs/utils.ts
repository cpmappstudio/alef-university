import type { Doc, Id } from "@/convex/_generated/dataModel";
import type {
  Program,
  ProgramCategoryDocument,
  ProgramCreatePayload,
  ProgramExportRow,
  ProgramFormErrors,
  ProgramFormState,
  ProgramFormValidationMessages,
  ProgramFormValidationResult,
  ProgramLanguageOption,
  ProgramTypeOption,
  ProgramUpdatePayload,
} from "@/lib/programs/types";
import type { Translator } from "@/lib/table/types";
import { exportProgramsToPDF } from "@/lib/export-programs-pdf";
import {
  getLocalizedFieldVisibility,
  hasContent,
  normalizeTextValue,
  parsePositiveNumber,
  safeNumberToString,
} from "@/lib/forms/utils";
import { ROUTES } from "@/lib/routes";

type CourseForExport = Doc<"courses">;

type CourseExportTranslations = {
  title: string;
  generatedOn: string;
  totalPrograms: string;
  page: string;
  of: string;
  columns: {
    code: string;
    program: string;
    type: string;
    category: string;
    language: string;
    credits: string;
    duration: string;
    status: string;
  };
  types: Record<string, string>;
  languages: {
    es: string;
    en: string;
    both: string;
  };
  status: {
    active: string;
    inactive: string;
  };
  emptyValue: string;
};

export type ExportCourseTableOptions = {
  courses: CourseForExport[];
  translations: CourseExportTranslations;
  locale: string;
};

export type ProgramCourseExportOptions = {
  program: Doc<"programs">;
  courses: CourseForExport[];
  locale: string;
  detailTranslator: Translator;
  tableTranslator: Translator;
  courseFormTranslator: Translator;
  exportTranslator: Translator;
};

export const PROGRAMS_TABLE_FILTER_COLUMN = "program";

const INITIAL_PROGRAM_FORM_STATE: ProgramFormState = {
  language: "",
  type: "",
  categoryId: "",
  codeEs: "",
  nameEs: "",
  descriptionEs: "",
  codeEn: "",
  nameEn: "",
  descriptionEn: "",
  durationBimesters: "",
  isActive: true,
};

export function createEmptyProgramFormState(): ProgramFormState {
  return { ...INITIAL_PROGRAM_FORM_STATE };
}

export function createFormStateFromProgram(
  program: Program | null | undefined,
): ProgramFormState {
  if (!program) {
    return createEmptyProgramFormState();
  }

  return {
    language: normalizeProgramFormLanguage(program.language),
    type: program.type ?? "",
    categoryId: program.categoryId ? String(program.categoryId) : "",
    codeEs: program.codeEs ?? "",
    nameEs: program.nameEs ?? "",
    descriptionEs: program.descriptionEs ?? "",
    codeEn: program.codeEn ?? "",
    nameEn: program.nameEn ?? "",
    descriptionEn: program.descriptionEn ?? "",
    durationBimesters: safeNumberToString(program.durationBimesters),
    isActive: program.isActive ?? true,
  };
}

export function getLanguageVisibility(language: ProgramFormState["language"]): {
  showSpanishFields: boolean;
  showEnglishFields: boolean;
} {
  return getLocalizedFieldVisibility(language);
}

export function validateProgramForm(
  values: ProgramFormState,
  messages: ProgramFormValidationMessages,
): ProgramFormValidationResult {
  const errors: ProgramFormErrors = {};

  if (!isProgramLanguageOption(values.language)) {
    errors.language = messages.languageRequired;
  }

  if (!isProgramTypeOption(values.type)) {
    errors.type = messages.typeRequired;
  }

  if (!hasContent(values.categoryId)) {
    errors.categoryId = messages.categoryRequired;
  }

  const { showSpanishFields, showEnglishFields } = getLanguageVisibility(
    values.language,
  );

  if (showSpanishFields) {
    if (!hasContent(values.codeEs)) {
      errors.codeEs = messages.codeEsRequired;
    }
    if (!hasContent(values.nameEs)) {
      errors.nameEs = messages.nameEsRequired;
    }
    if (!hasContent(values.descriptionEs)) {
      errors.descriptionEs = messages.descriptionEsRequired;
    }
  }

  if (showEnglishFields) {
    if (!hasContent(values.codeEn)) {
      errors.codeEn = messages.codeEnRequired;
    }
    if (!hasContent(values.nameEn)) {
      errors.nameEn = messages.nameEnRequired;
    }
    if (!hasContent(values.descriptionEn)) {
      errors.descriptionEn = messages.descriptionEnRequired;
    }
  }

  if (parsePositiveNumber(values.durationBimesters) === null) {
    errors.durationBimesters = messages.durationBimestersPositive;
  }

  return {
    errors,
    isValid: Object.keys(errors).length === 0,
  };
}

export function buildProgramCreatePayload(
  values: ProgramFormState,
): ProgramCreatePayload {
  if (!isProgramLanguageOption(values.language)) {
    throw new Error("Invalid program language");
  }

  if (!isProgramTypeOption(values.type)) {
    throw new Error("Invalid program type");
  }

  const categoryId = normalizeId(values.categoryId);
  if (!categoryId) {
    throw new Error("Program category is required");
  }

  const durationBimesters = parsePositiveNumber(values.durationBimesters);
  if (durationBimesters === null) {
    throw new Error("Duration must be a positive number");
  }

  const { showSpanishFields, showEnglishFields } = getLanguageVisibility(
    values.language,
  );

  return {
    language: values.language as ProgramLanguageOption,
    type: values.type as ProgramTypeOption,
    categoryId: categoryId as Id<"program_categories">,
    durationBimesters,
    ...(showSpanishFields
      ? {
          codeEs: normalizeTextValue(values.codeEs),
          nameEs: normalizeTextValue(values.nameEs),
          descriptionEs: normalizeTextValue(values.descriptionEs),
        }
      : {}),
    ...(showEnglishFields
      ? {
          codeEn: normalizeTextValue(values.codeEn),
          nameEn: normalizeTextValue(values.nameEn),
          descriptionEn: normalizeTextValue(values.descriptionEn),
        }
      : {}),
  };
}

export function buildProgramUpdatePayload(
  programId: ProgramUpdatePayload["programId"],
  values: ProgramFormState,
): ProgramUpdatePayload {
  if (!isProgramLanguageOption(values.language)) {
    throw new Error("Invalid program language");
  }

  if (!isProgramTypeOption(values.type)) {
    throw new Error("Invalid program type");
  }

  const categoryId = normalizeId(values.categoryId);
  if (!categoryId) {
    throw new Error("Program category is required");
  }

  const durationBimesters = parsePositiveNumber(values.durationBimesters);
  if (durationBimesters === null) {
    throw new Error("Duration must be a positive number");
  }

  const { showSpanishFields, showEnglishFields } = getLanguageVisibility(
    values.language,
  );

  return {
    programId,
    categoryId: categoryId as Id<"program_categories">,
    language: values.language as ProgramLanguageOption,
    type: values.type as ProgramTypeOption,
    durationBimesters,
    isActive: values.isActive,
    ...(showSpanishFields
      ? {
          codeEs: normalizeTextValue(values.codeEs),
          nameEs: normalizeTextValue(values.nameEs),
          descriptionEs: normalizeTextValue(values.descriptionEs),
        }
      : {}),
    ...(showEnglishFields
      ? {
          codeEn: normalizeTextValue(values.codeEn),
          nameEn: normalizeTextValue(values.nameEn),
          descriptionEn: normalizeTextValue(values.descriptionEn),
        }
      : {}),
  };
}

export function buildProgramDetailsPath(
  locale: string,
  programId: Id<"programs"> | string,
) {
  const normalizedId = String(programId);
  return ROUTES.programs.details(normalizedId).withLocale(locale);
}

export function createProgramCategoryLabelMap(
  categories: ProgramCategoryDocument[] | undefined,
) {
  if (!categories || categories.length === 0) {
    return {};
  }

  return categories.reduce<Record<string, string>>((acc, category) => {
    const key = String(category._id);
    const label = category.name?.trim();

    acc[key] = label && label.length > 0 ? label : key;
    return acc;
  }, {});
}

export function buildProgramExportTranslations(
  tableTranslations: Translator,
  exportTranslations: Translator,
) {
  return {
    title: exportTranslations("title"),
    generatedOn: exportTranslations("generatedOn"),
    totalPrograms: exportTranslations("totalPrograms"),
    page: exportTranslations("page"),
    of: exportTranslations("of"),
    columns: {
      code: tableTranslations("columns.code"),
      program: tableTranslations("columns.program"),
      type: tableTranslations("columns.type"),
      category: tableTranslations("columns.category"),
      language: tableTranslations("columns.language"),
      credits: tableTranslations("columns.credits"),
      duration: tableTranslations("columns.duration"),
      status: tableTranslations("columns.status"),
    },
    types: {
      diploma: tableTranslations("types.diploma"),
      bachelor: tableTranslations("types.bachelor"),
      master: tableTranslations("types.master"),
      doctorate: tableTranslations("types.doctorate"),
    },
    languages: {
      es: tableTranslations("languages.es"),
      en: tableTranslations("languages.en"),
      both: tableTranslations("languages.both"),
    },
    status: {
      active: tableTranslations("status.active"),
      inactive: tableTranslations("status.inactive"),
    },
    emptyValue: tableTranslations("columns.emptyValue"),
  };
}

export function exportCourseTable({
  courses,
  translations,
  locale,
}: ExportCourseTableOptions) {
  const categoryIds = new Set<string>(
    courses
      .map((course) => course.category as string)
      .filter((value): value is string => Boolean(value)),
  );

  const courseCategoryLabels: Record<string, string> = {};
  for (const category of Object.keys(translations.types)) {
    if (categoryIds.has(category)) {
      courseCategoryLabels[category] = translations.types[category];
    }
  }

  const coursesAsPrograms: ProgramExportRow[] = courses.map((course) => ({
    _id: course._id,
    _creationTime: course._creationTime,
    codeEs: course.codeEs,
    codeEn: course.codeEn,
    nameEs: course.nameEs,
    nameEn: course.nameEn,
    descriptionEs: course.descriptionEs,
    descriptionEn: course.descriptionEn,
    type: course.category,
    language: course.language,
    totalCredits: course.credits,
    isActive: course.isActive,
    createdAt: course.createdAt,
  }));

  exportProgramsToPDF({
    programs: coursesAsPrograms,
    categoryLabels: courseCategoryLabels,
    locale,
    translations: {
      ...translations,
      types: translations.types as {
        diploma: string;
        bachelor: string;
        master: string;
        doctorate: string;
      },
    },
  });
}

export function exportProgramCourses({
  program,
  courses,
  locale,
  detailTranslator,
  tableTranslator,
  courseFormTranslator,
  exportTranslator,
}: ProgramCourseExportOptions) {
  const nameEs = program.nameEs || "";
  const nameEn = program.nameEn || "";
  const programName = locale === "es" ? nameEs || nameEn : nameEn || nameEs;

  const translations: CourseExportTranslations = {
    title: `${programName} - ${detailTranslator("courses")}`,
    generatedOn: exportTranslator("generatedOn"),
    totalPrograms: `${courses.length} ${detailTranslator("totalCourses")}`,
    page: exportTranslator("page"),
    of: exportTranslator("of"),
    columns: {
      code: tableTranslator("columns.code"),
      program: tableTranslator("columns.course"),
      type: tableTranslator("columns.category"),
      category: tableTranslator("columns.emptyValue"),
      language: tableTranslator("columns.language"),
      credits: tableTranslator("columns.credits"),
      duration: tableTranslator("columns.emptyValue"),
      status: tableTranslator("columns.status"),
    },
    types: {
      humanities: courseFormTranslator("options.categories.humanities"),
      core: courseFormTranslator("options.categories.core"),
      elective: courseFormTranslator("options.categories.elective"),
      general: courseFormTranslator("options.categories.general"),
    },
    languages: {
      es: tableTranslator("languages.es"),
      en: tableTranslator("languages.en"),
      both: tableTranslator("languages.both"),
    },
    status: {
      active: tableTranslator("status.active"),
      inactive: tableTranslator("status.inactive"),
    },
    emptyValue: tableTranslator("columns.emptyValue"),
  };

  exportCourseTable({
    courses,
    translations,
    locale,
  });
}

function normalizeId(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function normalizeProgramFormLanguage(
  language: Program["language"],
): ProgramFormState["language"] {
  if (!language) {
    return "";
  }
  return language === "both" ? "es" : language;
}

function isProgramLanguageOption(
  value: string,
): value is ProgramLanguageOption {
  return value === "es" || value === "en" || value === "both";
}

function isProgramTypeOption(value: string): value is ProgramTypeOption {
  return (
    value === "diploma" ||
    value === "bachelor" ||
    value === "master" ||
    value === "doctorate"
  );
}
