import { normalizeTextValue } from "@/lib/forms/utils";
import type {
  StudentCreatePayload,
  StudentDocument,
  StudentFormErrors,
  StudentFormState,
  StudentUpdatePayload,
  StudentStatus,
} from "@/lib/students/types";
import type { Id } from "@/convex/_generated/dataModel";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const studentStatuses: StudentStatus[] = [
  "active",
  "inactive",
  "on_leave",
  "graduated",
  "withdrawn",
];

export const createEmptyStudentFormState = (): StudentFormState => ({
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  country: "",
  dateOfBirth: "",
  nationality: "",
  documentType: undefined,
  documentNumber: "",
  studentCode: "",
  programId: "",
  enrollmentDate: "",
  status: "active",
  isActive: true,
});

export const createStudentFormStateFromDoc = (
  student?: StudentDocument | null,
): StudentFormState => {
  if (!student) {
    return createEmptyStudentFormState();
  }

  return {
    firstName: student.firstName ?? "",
    lastName: student.lastName ?? "",
    email: student.email ?? "",
    phone: student.phone ?? "",
    country: student.country ?? "",
    dateOfBirth: student.dateOfBirth
      ? new Date(student.dateOfBirth).toISOString().split("T")[0]
      : "",
    nationality: student.nationality ?? "",
    documentType: student.documentType ?? undefined,
    documentNumber: student.documentNumber ?? "",
    studentCode: student.studentProfile?.studentCode ?? "",
    programId: (student.studentProfile?.programId as Id<"programs"> | undefined)
      ?.toString() ?? "",
    enrollmentDate: student.studentProfile?.enrollmentDate
      ? new Date(student.studentProfile.enrollmentDate)
          .toISOString()
          .split("T")[0]
      : "",
    status: student.studentProfile?.status ?? "active",
    isActive: student.isActive ?? true,
  };
};

export const validateStudentForm = (
  state: StudentFormState,
): StudentFormErrors => {
  const errors: StudentFormErrors = {};

  if (!state.firstName.trim()) {
    errors.firstName = "firstName";
  }
  if (!state.lastName.trim()) {
    errors.lastName = "lastName";
  }
  if (!state.email.trim() || !EMAIL_REGEX.test(state.email.trim())) {
    errors.email = "email";
  }
  if (!state.studentCode.trim()) {
    errors.studentCode = "studentCode";
  }
  if (!state.programId) {
    errors.programId = "programId";
  }
  if (!state.enrollmentDate) {
    errors.enrollmentDate = "enrollmentDate";
  }
  if (!state.status) {
    errors.status = "status";
  }

  return errors;
};

export const buildStudentCreatePayload = (
  state: StudentFormState,
): StudentCreatePayload => {
  const enrollmentDate = state.enrollmentDate
    ? new Date(state.enrollmentDate).getTime()
    : Date.now();

  const dateOfBirth = state.dateOfBirth
    ? new Date(state.dateOfBirth).getTime()
    : undefined;

  return {
    firstName: state.firstName.trim(),
    lastName: state.lastName.trim(),
    email: state.email.trim(),
    phone: normalizeTextValue(state.phone),
    country: normalizeTextValue(state.country),
    dateOfBirth,
    nationality: normalizeTextValue(state.nationality),
    documentType: state.documentType,
    documentNumber: normalizeTextValue(state.documentNumber),
    studentProfile: {
      studentCode: state.studentCode.trim(),
      programId: state.programId as Id<"programs">,
      enrollmentDate,
      status: state.status ?? "active",
    },
    isActive: state.isActive,
  };
};

export const buildStudentUpdatePayload = (
  student: StudentDocument,
  state: StudentFormState,
): StudentUpdatePayload => {
  return {
    clerkId: student.clerkId,
    ...buildStudentCreatePayload(state),
  };
};
