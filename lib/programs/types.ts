import type { ReactNode } from "react";
import type { Id } from "@/convex/_generated/dataModel";

export type Program = {
  codeEs: string | undefined;
  codeEn: string | undefined;
  nameEs: string | undefined;
  nameEn: string | undefined;
  descriptionEs: string | undefined;
  descriptionEn: string | undefined;
  type: "diploma" | "bachelor" | "master" | "doctorate";
  degree: string | undefined;
  language: "es" | "en" | "both";
  totalCredits: number;
  durationBimesters: number;
  tuitionPerCredit: number | undefined;
  isActive: boolean;
  createdAt: number;
  updatedAt: number | undefined;
};

export type ProgramLanguageOption = Program["language"];
export type ProgramTypeOption = Program["type"];

export type ProgramFormLanguage = ProgramLanguageOption | "";
export type ProgramFormType = ProgramTypeOption | "";

export type ProgramFormState = {
  language: ProgramFormLanguage;
  type: ProgramFormType;
  codeEs: string;
  nameEs: string;
  descriptionEs: string;
  codeEn: string;
  nameEn: string;
  descriptionEn: string;
  totalCredits: string;
  durationBimesters: string;
  isActive: boolean;
};

export type ProgramFormErrorKey =
  | "language"
  | "type"
  | "codeEs"
  | "nameEs"
  | "descriptionEs"
  | "codeEn"
  | "nameEn"
  | "descriptionEn"
  | "totalCredits"
  | "durationBimesters";

export type ProgramFormErrors = Partial<Record<ProgramFormErrorKey, string>>;

export type ProgramFormValidationMessages = {
  languageRequired: string;
  typeRequired: string;
  codeEsRequired: string;
  nameEsRequired: string;
  descriptionEsRequired: string;
  codeEnRequired: string;
  nameEnRequired: string;
  descriptionEnRequired: string;
  totalCreditsPositive: string;
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
  language: ProgramLanguageOption;
  type: ProgramTypeOption;
  totalCredits: number;
  durationBimesters: number;
  tuitionPerCredit?: number;
  degree?: string;
};

export type ProgramUpdatePayload = {
  programId: Id<"programs">;
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
