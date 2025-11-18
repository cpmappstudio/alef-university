import type {
  Course,
  CourseCreatePayload,
  CourseFormErrors,
  CourseFormState,
  CourseFormValidationMessages,
  CourseFormValidationResult,
  CourseLanguageOption,
  CourseCategoryOption,
  CourseUpdatePayload,
  CourseProgramSummary,
  CourseJSONLExport,
  CourseDocument,
} from "./types";
import type { Doc } from "@/convex/_generated/dataModel";

export const INITIAL_COURSE_FORM_STATE: CourseFormState = {
  language: "",
  category: "",
  codeEs: "",
  nameEs: "",
  descriptionEs: "",
  codeEn: "",
  nameEn: "",
  descriptionEn: "",
  // credits is now per-program, not a global field
  isActive: true,
};

export function createEmptyCourseFormState(): CourseFormState {
  return { ...INITIAL_COURSE_FORM_STATE };
}

export function createFormStateFromCourse(
  course: Course | null | undefined,
): CourseFormState {
  if (!course) {
    return createEmptyCourseFormState();
  }

  return {
    language: normalizeCourseFormLanguage(course.language),
    category: course.category ?? "",
    codeEs: course.codeEs ?? "",
    nameEs: course.nameEs ?? "",
    descriptionEs: course.descriptionEs ?? "",
    codeEn: course.codeEn ?? "",
    nameEn: course.nameEn ?? "",
    descriptionEn: course.descriptionEn ?? "",
    // credits is now per-program, only include for backwards compatibility
    ...(course.credits !== undefined
      ? { credits: safeNumberToString(course.credits) }
      : {}),
    isActive: Boolean(course.isActive),
  };
}

export function getLanguageVisibility(language: CourseFormState["language"]): {
  showSpanishFields: boolean;
  showEnglishFields: boolean;
} {
  return {
    showSpanishFields: language === "es" || language === "both",
    showEnglishFields: language === "en" || language === "both",
  };
}

export function validateCourseForm(
  values: CourseFormState,
  messages: CourseFormValidationMessages,
): CourseFormValidationResult {
  const errors: CourseFormErrors = {};
  const { showSpanishFields, showEnglishFields } = getLanguageVisibility(
    values.language,
  );

  if (!isCourseLanguageOption(values.language)) {
    errors.language = messages.languageRequired;
  }

  if (!isCourseCategoryOption(values.category)) {
    errors.category = messages.categoryRequired;
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

  // Credits are now assigned per program, not validated here

  return {
    errors,
    isValid: Object.keys(errors).length === 0,
  };
}

export function buildCourseCreatePayload(
  values: CourseFormState,
): CourseCreatePayload {
  if (!isCourseLanguageOption(values.language)) {
    throw new Error("Invalid course language");
  }

  if (!isCourseCategoryOption(values.category)) {
    throw new Error("Invalid course category");
  }

  // Credits are now per-program, not a global field
  // Only include if provided (for backwards compatibility)
  const parsedCredits = values.credits
    ? parsePositiveNumber(values.credits)
    : null;

  const { showSpanishFields, showEnglishFields } = getLanguageVisibility(
    values.language,
  );

  const payload: CourseCreatePayload = {
    language: values.language as CourseLanguageOption,
    category: values.category as CourseCategoryOption,
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

  // Only include credits if it's a valid number
  if (parsedCredits !== null && parsedCredits !== undefined) {
    payload.credits = parsedCredits;
  }

  return payload;
}

export function buildCourseUpdatePayload(
  courseId: CourseUpdatePayload["courseId"],
  values: CourseFormState,
): CourseUpdatePayload {
  if (!isCourseLanguageOption(values.language)) {
    throw new Error("Invalid course language");
  }

  if (!isCourseCategoryOption(values.category)) {
    throw new Error("Invalid course category");
  }

  const { showSpanishFields, showEnglishFields } = getLanguageVisibility(
    values.language,
  );

  return {
    courseId,
    language: values.language as CourseLanguageOption,
    category: values.category as CourseCategoryOption,
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

export function isCourseLanguageOption(
  value: string,
): value is CourseLanguageOption {
  return value === "es" || value === "en" || value === "both";
}

export function isCourseCategoryOption(
  value: string,
): value is CourseCategoryOption {
  return (
    value === "humanities" ||
    value === "core" ||
    value === "elective" ||
    value === "general"
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

function normalizeCourseFormLanguage(
  language: Course["language"],
): CourseFormState["language"] {
  if (!language) {
    return "";
  }
  return language === "both" ? "es" : language;
}

export function getCourseProgramName(
  program: CourseProgramSummary,
  locale: string,
  fallback = "-",
): string {
  if (locale === "es") {
    return program.nameEs || program.nameEn || fallback;
  }
  return program.nameEn || program.nameEs || fallback;
}

export function getCourseProgramCode(
  program: CourseProgramSummary,
  locale: string,
  fallback = "-",
): string {
  if (locale === "es") {
    return program.codeEs || program.codeEn || fallback;
  }
  return program.codeEn || program.codeEs || fallback;
}

/**
 * Export courses to JSONL format
 * Each line is a valid JSON object representing a course
 */
export function exportCoursesToJSONL(
  courses: CourseDocument[],
  locale: string,
): void {
  // Convert each course to JSONL format
  const lines = courses.map((course) => {
    // Get program codes for this course
    const programCodes =
      course.programs
        ?.map((program) => {
          return program.codeEs || "";
        })
        .filter((code) => code !== "") || [];

    const data: CourseJSONLExport = {
      language: course.language === "both" ? "es" : course.language,
      category: course.category,
      credits: course.credits ?? course.programs?.[0]?.credits ?? 3, // Use first program's credits or default to 3
      isActive: course.isActive ?? true,
      programCodes: programCodes.length > 0 ? programCodes : undefined,
    };

    // Add language-specific fields based on course language
    if (course.language === "es") {
      data.codeEs = course.codeEs || "";
      data.nameEs = course.nameEs || "";
      data.descriptionEs = course.descriptionEs || "";
    } else if (course.language === "en") {
      data.codeEn = course.codeEn || "";
      data.nameEn = course.nameEn || "";
      data.descriptionEn = course.descriptionEn || "";
    }

    // Remove undefined values for cleaner JSONL
    Object.keys(data).forEach((key) => {
      if (data[key as keyof CourseJSONLExport] === undefined) {
        delete data[key as keyof CourseJSONLExport];
      }
    });

    return JSON.stringify(data);
  });

  // Join lines with newline character
  const jsonlContent = lines.join("\n");

  // Create blob and download
  const blob = new Blob([jsonlContent], { type: "application/x-ndjson" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;

  // Generate filename with current date
  const dateStr = new Date().toISOString().split("T")[0];
  link.download = `courses_export_${dateStr}.jsonl`;

  // Trigger download
  document.body.appendChild(link);
  link.click();

  // Cleanup
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
