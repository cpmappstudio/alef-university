import type { ReactNode } from "react";
import type { Doc, Id } from "@/convex/_generated/dataModel";

export type Course = {
  _id: Id<"courses">;
  _creationTime?: number;

  codeEs?: string | undefined;
  codeEn?: string | undefined;

  nameEs?: string | undefined;
  nameEn?: string | undefined;

  descriptionEs?: string | undefined;
  descriptionEn?: string | undefined;

  credits: number;

  language: "es" | "en" | "both";

  category: "humanities" | "core" | "elective" | "general";

  syllabus?: string;

  isActive: boolean;

  createdAt?: number;
  updatedAt?: number | undefined;
};

export type CourseLanguageOption = "es" | "en" | "both";
export type CourseCategoryOption =
  | "humanities"
  | "core"
  | "elective"
  | "general";

export type CourseFormLanguage = CourseLanguageOption | "";
export type CourseFormCategory = CourseCategoryOption | "";

export type CourseFormState = {
  language: CourseFormLanguage;
  category: CourseFormCategory;

  codeEs: string;
  nameEs: string;
  descriptionEs: string;

  codeEn: string;
  nameEn: string;
  descriptionEn: string;

  credits: string;

  isActive: boolean;
};

export type CourseFormErrorKey =
  | "language"
  | "category"
  | "codeEs"
  | "nameEs"
  | "descriptionEs"
  | "codeEn"
  | "nameEn"
  | "descriptionEn"
  | "credits";

export type CourseFormErrors = Partial<Record<CourseFormErrorKey, string>>;

export type CourseFormValidationMessages = {
  languageRequired: string;
  categoryRequired: string;
  codeEsRequired: string;
  nameEsRequired: string;
  descriptionEsRequired: string;
  codeEnRequired: string;
  nameEnRequired: string;
  descriptionEnRequired: string;
  creditsPositive: string;
};

export type CourseFormValidationResult = {
  errors: CourseFormErrors;
  isValid: boolean;
};

export type CourseCreatePayload = {
  codeEs?: string;
  codeEn?: string;

  nameEs?: string;
  nameEn?: string;

  descriptionEs?: string;
  descriptionEn?: string;

  language: CourseLanguageOption;
  category: CourseCategoryOption;

  credits: number;
};

export type CourseUpdatePayload = {
  courseId: Id<"courses">;

  language: CourseLanguageOption;
  category: CourseCategoryOption;
  isActive: boolean;

  codeEs?: string;
  codeEn?: string;

  nameEs?: string;
  nameEn?: string;

  descriptionEs?: string;
  descriptionEn?: string;
};

export type CourseFormDialogMode = "create" | "edit";

export type CourseFormDialogProps = {
  mode: CourseFormDialogMode;
  programId?: Id<"programs">; // For creating course associated with a program
  course?: Course | null;
  trigger?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export type CourseProgramSummary = Pick<
  Doc<"programs">,
  "_id" | "nameEs" | "nameEn" | "codeEs" | "codeEn"
>;

export type CourseRow = Doc<"courses"> & {
  programs?: Array<{
    _id: string;
    codeEs: string;
    name: string;
  }>;
};

export type CourseDocument = CourseRow;

export type CourseManagementClientProps = {
  courses: CourseDocument[];
};

export type CourseClassRow = Doc<"classes"> & {
  status?: "open" | "active" | "grading" | "completed";
  enrolledCount?: number;
  bimester?: Doc<"bimesters"> | null;
  professor?: Doc<"users"> | null;
  course?: Doc<"courses"> | null;
};
