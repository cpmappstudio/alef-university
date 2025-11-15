import type { Doc, Id } from "@/convex/_generated/dataModel";
import type { useTranslations } from "next-intl";
import type {
  Program,
  ProgramCreatePayload,
  ProgramFormErrors,
  ProgramFormState,
  ProgramFormValidationMessages,
  ProgramFormValidationResult,
  ProgramLanguageOption,
  ProgramTypeOption,
  ProgramUpdatePayload,
} from "./types";

type Translator = ReturnType<typeof useTranslations>;

export type ProgramCategoryWithCount = Doc<"program_categories"> & {
  programCount?: number;
};

export type ProgramExportTranslations = {
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
  types: {
    diploma: string;
    bachelor: string;
    master: string;
    doctorate: string;
  };
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

export const PROGRAMS_TABLE_FILTER_COLUMN = "program";

export const INITIAL_PROGRAM_FORM_STATE: ProgramFormState = {
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
    language: program.language ?? "",
    type: program.type ?? "",
    categoryId: program.categoryId ?? "",
    codeEs: program.codeEs ?? "",
    nameEs: program.nameEs ?? "",
    descriptionEs: program.descriptionEs ?? "",
    codeEn: program.codeEn ?? "",
    nameEn: program.nameEn ?? "",
    descriptionEn: program.descriptionEn ?? "",
    durationBimesters: safeNumberToString(program.durationBimesters),
    isActive: Boolean(program.isActive),
  };
}

export function getLanguageVisibility(language: ProgramFormState["language"]): {
  showSpanishFields: boolean;
  showEnglishFields: boolean;
} {
  return {
    showSpanishFields: language === "es" || language === "both",
    showEnglishFields: language === "en" || language === "both",
  };
}

export function validateProgramForm(
  values: ProgramFormState,
  messages: ProgramFormValidationMessages,
): ProgramFormValidationResult {
  const errors: ProgramFormErrors = {};
  const { showSpanishFields, showEnglishFields } = getLanguageVisibility(
    values.language,
  );

  if (!isProgramLanguageOption(values.language)) {
    errors.language = messages.languageRequired;
  }

  if (!isProgramTypeOption(values.type)) {
    errors.type = messages.typeRequired;
  }

  if (!hasContent(values.categoryId)) {
    errors.categoryId = messages.categoryRequired;
  }

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

  const durationBimesters = parsePositiveNumber(values.durationBimesters);

  if (durationBimesters === null) {
    throw new Error("Invalid numeric value for duration");
  }

  const { showSpanishFields, showEnglishFields } = getLanguageVisibility(
    values.language,
  );

  if (!hasContent(values.categoryId)) {
    throw new Error("Invalid program category");
  }

  return {
    language: values.language as ProgramLanguageOption,
    type: values.type as ProgramTypeOption,
    categoryId: values.categoryId as ProgramCreatePayload["categoryId"],
    durationBimesters,
    ...(showSpanishFields
      ? {
          codeEs: normalize(values.codeEs),
          nameEs: normalize(values.nameEs),
          descriptionEs: normalize(values.descriptionEs),
        }
      : {}),
    ...(showEnglishFields
      ? {
          codeEn: normalize(values.codeEn),
          nameEn: normalize(values.nameEn),
          descriptionEn: normalize(values.descriptionEn),
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

  const { showSpanishFields, showEnglishFields } = getLanguageVisibility(
    values.language,
  );

  if (!hasContent(values.categoryId)) {
    throw new Error("Invalid program category");
  }

  return {
    programId,
    categoryId: values.categoryId as ProgramUpdatePayload["categoryId"],
    language: values.language as ProgramLanguageOption,
    isActive: values.isActive,
    ...(showSpanishFields
      ? {
          codeEs: normalize(values.codeEs),
          nameEs: normalize(values.nameEs),
          descriptionEs: normalize(values.descriptionEs),
        }
      : {}),
    ...(showEnglishFields
      ? {
          codeEn: normalize(values.codeEn),
          nameEn: normalize(values.nameEn),
          descriptionEn: normalize(values.descriptionEn),
        }
      : {}),
  };
}

export function isProgramLanguageOption(
  value: string,
): value is ProgramLanguageOption {
  return value === "es" || value === "en" || value === "both";
}

export function isProgramTypeOption(value: string): value is ProgramTypeOption {
  return (
    value === "diploma" ||
    value === "bachelor" ||
    value === "master" ||
    value === "doctorate"
  );
}

function hasContent(value: string): boolean {
  return normalize(value) !== undefined;
}

function normalize(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

function parsePositiveNumber(value: string): number | null {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return null;
  }
  return numeric > 0 ? numeric : null;
}

function safeNumberToString(value: number | null | undefined): string {
  return typeof value === "number" && Number.isFinite(value)
    ? String(value)
    : "";
}

export function createProgramCategoryLabelMap(
  categories: ProgramCategoryWithCount[] | undefined | null,
): Record<string, string> {
  if (!categories?.length) {
    return {};
  }

  return categories.reduce<Record<string, string>>((acc, category) => {
    const trimmedName = category.name.trim();
    acc[String(category._id)] = trimmedName || category.name;
    return acc;
  }, {});
}

export function buildProgramExportTranslations(
  tableTranslations: Translator,
  exportTranslations: Translator,
): ProgramExportTranslations {
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

export function buildProgramDetailsPath(
  locale: string,
  programId: Id<"programs"> | string,
): string {
  const normalizedLocale = locale?.trim();
  const localeSegment = normalizedLocale ? `/${normalizedLocale}` : "";
  return `${localeSegment}/programs/${String(programId)}`;
}
