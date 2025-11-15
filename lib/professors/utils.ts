import { normalizeTextValue } from "@/lib/forms/utils";
import type {
  ProfessorCreatePayload,
  ProfessorDocument,
  ProfessorFormState,
  ProfessorFormValidationMessages,
  ProfessorFormValidationResult,
  ProfessorUpdatePayload,
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
  role: "professor",
  firstName: state.firstName.trim(),
  lastName: state.lastName.trim(),
  email: state.email.trim(),
  phone: normalizeTextValue(state.phone),
  country: normalizeTextValue(state.country),
});

export const buildProfessorUpdatePayload = (
  professorId: ProfessorUpdatePayload["professorId"],
  state: ProfessorFormState,
): ProfessorUpdatePayload => ({
  professorId,
  firstName: state.firstName.trim(),
  lastName: state.lastName.trim(),
  email: state.email.trim(),
  phone: normalizeTextValue(state.phone),
  country: normalizeTextValue(state.country),
  isActive: state.isActive,
});
