import { normalizeTextValue } from "@/lib/forms/utils";
import type {
  ProfessorCreatePayload,
  ProfessorDocument,
  ProfessorFormState,
  ProfessorFormValidationMessages,
  ProfessorFormValidationResult,
  ProfessorUpdatePayload,
  ProfessorJSONLExport,
} from "@/lib/professors/types";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const createEmptyProfessorFormState = (): ProfessorFormState => ({
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  country: "",
  isActive: true,
});

export const createProfessorFormStateFromDoc = (
  professor?: ProfessorDocument | null,
): ProfessorFormState => {
  if (!professor) {
    return createEmptyProfessorFormState();
  }

  return {
    firstName: professor.firstName ?? "",
    lastName: professor.lastName ?? "",
    email: professor.email ?? "",
    phone: professor.phone ?? "",
    country: professor.country ?? "",
    isActive: professor.isActive ?? true,
  };
};

export const validateProfessorForm = (
  state: ProfessorFormState,
  messages: ProfessorFormValidationMessages,
): ProfessorFormValidationResult => {
  const errors: ProfessorFormValidationResult["errors"] = {};

  if (!state.firstName.trim()) {
    errors.firstName = messages.firstNameRequired;
  }

  if (!state.lastName.trim()) {
    errors.lastName = messages.lastNameRequired;
  }

  const email = state.email.trim();
  if (!email) {
    errors.email = messages.emailRequired;
  } else if (!EMAIL_REGEX.test(email)) {
    errors.email = messages.emailInvalid;
  }

  return {
    errors,
    isValid: Object.keys(errors).length === 0,
  };
};

export const buildProfessorCreatePayload = (
  state: ProfessorFormState,
): ProfessorCreatePayload => ({
  firstName: state.firstName.trim(),
  lastName: state.lastName.trim(),
  email: state.email.trim(),
  phone: state.phone.trim(),
  country: state.country.trim(),
  isActive: state.isActive,
});

export const buildProfessorUpdatePayload = (
  professor: ProfessorDocument,
  state: ProfessorFormState,
): ProfessorUpdatePayload => ({
  clerkId: professor.clerkId,
  firstName: state.firstName.trim(),
  lastName: state.lastName.trim(),
  email: state.email.trim(),
  phone: state.phone.trim(),
  country: state.country.trim(),
  isActive: state.isActive,
});

/**
 * Export professors to JSONL format
 * Each line is a valid JSON object representing a professor
 */
export function exportProfessorsToJSONL(professors: ProfessorDocument[]): void {
  // Convert each professor to JSONL format
  const lines = professors.map((professor) => {
    const data: ProfessorJSONLExport = {
      firstName: professor.firstName || "",
      lastName: professor.lastName || "",
      email: professor.email || "",
      isActive: professor.isActive ?? true,
      phone: professor.phone || undefined,
      country: professor.country || undefined,
    };

    // Remove undefined values for cleaner JSONL
    Object.keys(data).forEach((key) => {
      if (data[key as keyof ProfessorJSONLExport] === undefined) {
        delete data[key as keyof ProfessorJSONLExport];
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
  link.download = `professors_export_${dateStr}.jsonl`;

  // Trigger download
  document.body.appendChild(link);
  link.click();

  // Cleanup
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
