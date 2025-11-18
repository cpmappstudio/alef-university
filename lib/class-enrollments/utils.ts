/**
 * Utility functions for class enrollment import
 */

import type {
  ClassEnrollmentExcelRow,
  ClassEnrollmentJSONL,
} from "./types";

/**
 * Normalize a code by trimming whitespace and converting to uppercase
 */
export function normalizeCode(code: string): string {
  return code.trim().toUpperCase();
}

/**
 * Normalize email by trimming and converting to lowercase
 */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Create a unique key for a class based on its identifying attributes
 */
export function createClassKey(
  programCode: string,
  courseCode: string,
  bimesterName: string,
  groupNumber: string,
): string {
  return `${normalizeCode(programCode)}-${normalizeCode(courseCode)}-${bimesterName.trim()}-${groupNumber}`;
}

/**
 * Group Excel rows by class
 * Returns a map where keys are unique class identifiers and values are arrays of students
 */
export function groupEnrollmentsByClass(
  rows: ClassEnrollmentExcelRow[],
): Map<string, ClassEnrollmentJSONL> {
  const classesMap = new Map<string, ClassEnrollmentJSONL>();

  for (const row of rows) {
    // Skip invalid rows
    if (
      !row.programId ||
      !row.courseId ||
      !row.bimesterName ||
      !row.groupNumber ||
      !row.studentId
    ) {
      continue;
    }

    const groupNumber = String(row.groupNumber);
    const classKey = createClassKey(
      row.programId,
      row.courseId,
      row.bimesterName,
      groupNumber,
    );

    // Get or create class entry
    let classEntry = classesMap.get(classKey);
    if (!classEntry) {
      classEntry = {
        programCode: normalizeCode(row.programId),
        courseCode: normalizeCode(row.courseId),
        bimesterName: row.bimesterName.trim(),
        groupNumber,
        professorEmail: normalizeEmail(row.professorEmail || ""),
        students: [],
      };
      classesMap.set(classKey, classEntry);
    }

    // Add student to class
    classEntry.students.push({
      studentCode: normalizeCode(row.studentId),
      percentageGrade: row.percentageGrade,
    });
  }

  return classesMap;
}

/**
 * Convert grouped classes to JSONL format
 */
export function convertToJSONL(
  classesMap: Map<string, ClassEnrollmentJSONL>,
): string {
  const lines: string[] = [];

  for (const classData of classesMap.values()) {
    lines.push(JSON.stringify(classData));
  }

  return lines.join("\n");
}

/**
 * Parse JSONL content into array of class enrollment objects
 */
export function parseJSONL(content: string): ClassEnrollmentJSONL[] {
  const lines = content
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const classes: ClassEnrollmentJSONL[] = [];

  for (let i = 0; i < lines.length; i++) {
    try {
      const parsed = JSON.parse(lines[i]);
      classes.push(parsed);
    } catch (error) {
      throw new Error(
        `Invalid JSON at line ${i + 1}: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  return classes;
}

/**
 * Validate a percentage grade
 */
export function validateGrade(grade: number): {
  valid: boolean;
  error?: string;
} {
  if (typeof grade !== "number" || isNaN(grade)) {
    return { valid: false, error: "Grade must be a number" };
  }

  if (grade < 0 || grade > 100) {
    return { valid: false, error: "Grade must be between 0 and 100" };
  }

  return { valid: true };
}

/**
 * Validate a class enrollment JSONL object
 */
export function validateClassEnrollment(
  data: ClassEnrollmentJSONL,
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!data.programCode || typeof data.programCode !== "string") {
    errors.push("Missing or invalid programCode");
  }

  if (!data.courseCode || typeof data.courseCode !== "string") {
    errors.push("Missing or invalid courseCode");
  }

  if (!data.bimesterName || typeof data.bimesterName !== "string") {
    errors.push("Missing or invalid bimesterName");
  }

  if (!data.groupNumber || typeof data.groupNumber !== "string") {
    errors.push("Missing or invalid groupNumber");
  }

  if (!data.professorEmail || typeof data.professorEmail !== "string") {
    errors.push("Missing or invalid professorEmail");
  }

  if (!Array.isArray(data.students)) {
    errors.push("Missing or invalid students array");
  } else {
    for (let i = 0; i < data.students.length; i++) {
      const student = data.students[i];
      if (!student.studentCode) {
        errors.push(`Student at index ${i} missing studentCode`);
      }
      const gradeValidation = validateGrade(student.percentageGrade);
      if (!gradeValidation.valid) {
        errors.push(
          `Student at index ${i} has invalid grade: ${gradeValidation.error}`,
        );
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
