import { normalizeTextValue } from "@/lib/forms/utils";
import type {
  StudentCreatePayload,
  StudentDocument,
  StudentFormErrors,
  StudentFormState,
  StudentUpdatePayload,
  StudentJSONLExport,
  StudentGradeStats,
} from "@/lib/students/types";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import type { Translator } from "@/lib/table/types";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSING_GRADE = 60;

type GradeRow = {
  credits?: number;
  percentageGrade?: number | null;
};

export function calculateStudentGradeStats(grades: GradeRow[]): StudentGradeStats {
  const stats = grades.reduce(
    (acc, grade) => {
      const credits = grade.credits ?? 0;
      acc.enrolledCredits += credits;

      if (
        grade.percentageGrade !== undefined &&
        grade.percentageGrade !== null
      ) {
        acc.totalGradedCredits += credits;
        acc.weightedGradeSum += grade.percentageGrade * credits;

        if (grade.percentageGrade >= PASSING_GRADE) {
          acc.approvedCredits += credits;
        }
      }

      return acc;
    },
    {
      enrolledCredits: 0,
      approvedCredits: 0,
      totalGradedCredits: 0,
      weightedGradeSum: 0,
    },
  );

  const approvedPercentage =
    stats.enrolledCredits > 0
      ? Math.round((stats.approvedCredits / stats.enrolledCredits) * 100)
      : 0;

  const semesterAverage =
    stats.totalGradedCredits > 0
      ? Math.round((stats.weightedGradeSum / stats.totalGradedCredits) * 10) / 10
      : 0;

  return {
    enrolledCredits: stats.enrolledCredits,
    approvedCredits: stats.approvedCredits,
    approvedPercentage,
    semesterAverage,
  };
}

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
    programId:
      (
        student.studentProfile?.programId as Id<"programs"> | undefined
      )?.toString() ?? "",
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

  return errors;
};

export const buildStudentCreatePayload = (
  state: StudentFormState,
): StudentCreatePayload => {
  const dateOfBirth = state.dateOfBirth
    ? new Date(state.dateOfBirth).getTime()
    : undefined;

  return {
    firstName: state.firstName.trim(),
    lastName: state.lastName.trim(),
    email: state.email.trim(),
    phone: state.phone.trim(),
    country: state.country.trim(),
    dateOfBirth,
    nationality: (state.nationality ?? "").trim(),
    documentType: state.documentType,
    documentNumber:
      state.documentNumber && state.documentNumber.trim() !== ""
        ? state.documentNumber.trim()
        : undefined,
    studentProfile: {
      studentCode: state.studentCode.trim(),
      programId: state.programId as Id<"programs">,
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

export function buildStudentExportTranslations(
  tableTranslations: Translator,
  exportTranslations: Translator,
) {
  return {
    title: exportTranslations("title"),
    studentName: exportTranslations("studentName"),
    program: exportTranslations("program"),
    generatedOn: exportTranslations("generatedOn"),
    totalCourses: exportTranslations("totalCourses"),
    totalCredits: exportTranslations("totalCredits"),
    enrolledCredits: exportTranslations("enrolledCredits"),
    approvedCredits: exportTranslations("approvedCredits"),
    approvedPercentage: exportTranslations("approvedPercentage"),
    semesterAverage: exportTranslations("semesterAverage"),
    page: exportTranslations("page"),
    of: exportTranslations("of"),
    columns: {
      courseCode: tableTranslations("columns.courseCode"),
      courseName: tableTranslations("columns.courseName"),
      credits: tableTranslations("columns.credits"),
      percentageGrade: tableTranslations("columns.percentageGrade"),
      letterGrade: tableTranslations("columns.letterGrade"),
    },
    emptyValue: tableTranslations("columns.emptyValue"),
  };
}

/**
 * Export students to JSONL format
 * Each line is a valid JSON object representing a student
 */
export function exportStudentsToJSONL(
  students: StudentDocument[],
  programs: Doc<"programs">[],
  locale: string,
): void {
  // Create map of programId → programCode
  const programCodeMap = new Map<string, string>();
  programs.forEach((program) => {
    const code =
      locale === "es"
        ? program.codeEs || program.codeEn
        : program.codeEn || program.codeEs;
    programCodeMap.set(program._id, code || "");
  });

  // Convert each student to JSONL format
  const lines = students.map((student) => {
    const programCode =
      programCodeMap.get(student.studentProfile?.programId || "") || "";

    const data: StudentJSONLExport = {
      firstName: student.firstName || "",
      lastName: student.lastName || "",
      email: student.email || "",
      studentCode: student.studentProfile?.studentCode || "",
      programCode,
      isActive: student.isActive ?? true,
      phone: student.phone || undefined,
      country: student.country || undefined,
      dateOfBirth: student.dateOfBirth || undefined,
      nationality: student.nationality || undefined,
      documentType: student.documentType || undefined,
      documentNumber: student.documentNumber || undefined,
    };

    // Remove undefined values for cleaner JSONL
    Object.keys(data).forEach((key) => {
      if (data[key as keyof StudentJSONLExport] === undefined) {
        delete data[key as keyof StudentJSONLExport];
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
  link.download = `students_export_${dateStr}.jsonl`;

  // Trigger download
  document.body.appendChild(link);
  link.click();

  // Cleanup
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
