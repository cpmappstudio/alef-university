import type { ReactNode } from "react";
import type { Doc, Id } from "@/convex/_generated/dataModel";

export type Program = {
  _id?: Id<"programs">;
  _creationTime?: number;
  codeEs?: string | undefined;
  codeEn?: string | undefined;
  nameEs?: string | undefined;
  nameEn?: string | undefined;
  descriptionEs?: string | undefined;
  descriptionEn?: string | undefined;
  type?: "diploma" | "bachelor" | "master" | "doctorate";
  degree?: string | undefined;
  categoryId?: Id<"program_categories"> | undefined;
  language?: "es" | "en" | "both";
  totalCredits?: number;
  durationBimesters?: number;
  tuitionPerCredit?: number | undefined;
  isActive?: boolean;
  createdAt?: number;
  updatedAt?: number | undefined;
};

export type ProgramCategory = {
  _id: Id<"program_categories">;
  name: string;
};

export type ProgramLanguageOption = "es" | "en" | "both";
export type ProgramTypeOption = "diploma" | "bachelor" | "master" | "doctorate";

export type ProgramFormLanguage = ProgramLanguageOption | "";
export type ProgramFormType = ProgramTypeOption | "";

export type ProgramFormState = {
  language: ProgramFormLanguage;
  type: ProgramFormType;
  categoryId: string;
  codeEs: string;
  nameEs: string;
  descriptionEs: string;
  codeEn: string;
  nameEn: string;
  descriptionEn: string;
  durationBimesters: string;
  isActive: boolean;
};

export type ProgramFormErrorKey =
  | "language"
  | "type"
  | "categoryId"
  | "codeEs"
  | "nameEs"
  | "descriptionEs"
  | "codeEn"
  | "nameEn"
  | "descriptionEn"
  | "durationBimesters";

export type ProgramFormErrors = Partial<Record<ProgramFormErrorKey, string>>;

export type ProgramFormValidationMessages = {
  languageRequired: string;
  typeRequired: string;
  categoryRequired: string;
  codeEsRequired: string;
  nameEsRequired: string;
  descriptionEsRequired: string;
  codeEnRequired: string;
  nameEnRequired: string;
  descriptionEnRequired: string;
  durationBimestersPositive: string;
};

export type ProgramFormValidationResult = {
  errors: ProgramFormErrors;
  isValid: boolean;
};

export type ProgramCreatePayload = {
  codeEs?: string;
  codeEn?: string;
  nameEs?: string;
  nameEn?: string;
  descriptionEs?: string;
  descriptionEn?: string;
  categoryId: Id<"program_categories">;
  language: ProgramLanguageOption;
  type: ProgramTypeOption;
  durationBimesters: number;
  tuitionPerCredit?: number;
  degree?: string;
};

export type ProgramUpdatePayload = {
  programId: Id<"programs">;
  categoryId: Id<"program_categories">;
  language: ProgramLanguageOption;
  isActive: boolean;
  codeEs?: string;
  codeEn?: string;
  nameEs?: string;
  nameEn?: string;
  descriptionEs?: string;
  descriptionEn?: string;
  degree?: string;
  tuitionPerCredit?: number;
};

export type ProgramFormDialogMode = "create" | "edit";

export type ProgramFormDialogProps = {
  mode: ProgramFormDialogMode;
  program?: Program | null;
  trigger?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export type ProgramDocument = Doc<"programs">;
export type ProgramCategoryDocument = Doc<"program_categories">;
type CourseDocument = Doc<"courses">;
export type ProgramExportRow = Omit<
  ProgramDocument,
  "_id" | "type" | "durationBimesters"
> & {
  _id: ProgramDocument["_id"] | CourseDocument["_id"];
  type?: ProgramDocument["type"] | CourseDocument["category"];
  durationBimesters?: number | null;
};

export type ProgramManagementClientProps = {
  programs: ProgramDocument[];
  categories: ProgramCategoryDocument[];
};

export type ProgramRow = Doc<"programs">;
