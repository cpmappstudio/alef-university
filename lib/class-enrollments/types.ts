/**
 * Types for class enrollment import
 */

/**
 * Format of each line in the JSONL export/import file
 * Each line represents a unique class with its enrolled students
 */
export type ClassEnrollmentJSONL = {
  programCode: string; // Program code (e.g., "01L")
  courseCode: string; // Course code (e.g., "CCOU - 08")
  bimesterName: string; // Bimester name (e.g., "2021 Bimester I")
  groupNumber: string; // Group number (e.g., "1")
  professorEmail: string; // Professor's email
  students: {
    studentCode: string; // Student code (e.g., "01L-2021-01")
    percentageGrade: number; // Grade 0-100
  }[];
};

/**
 * Excel row format from the source file
 */
export type ClassEnrollmentExcelRow = {
  programId: string;
  courseId: string;
  professorName?: string;
  professorEmail?: string;
  studentId: string;
  percentageGrade: number;
  bimesterName: string;
  groupNumber: string | number;
};

/**
 * Result of importing a single class
 */
export type ClassImportResult = {
  success: boolean;
  classKey: string; // Unique identifier for the class
  classId?: string;
  enrollmentsCreated: number;
  errors: string[];
};

/**
 * Overall import result
 */
export type ImportResult = {
  classesProcessed: number;
  classesCreated: number;
  classesAlreadyExisted: number;
  enrollmentsCreated: number;
  enrollmentsUpdated: number;
  errors: ImportError[];
  warnings: string[];
};

/**
 * Import error detail
 */
export type ImportError = {
  line?: number;
  classKey?: string;
  studentCode?: string;
  type:
    | "program_not_found"
    | "course_not_found"
    | "bimester_not_found"
    | "professor_not_found"
    | "student_not_found"
    | "invalid_grade"
    | "class_creation_failed"
    | "enrollment_failed"
    | "unknown";
  message: string;
  data?: any;
};
