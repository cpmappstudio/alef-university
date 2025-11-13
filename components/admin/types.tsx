import { Id } from "@/convex/_generated/dataModel";

/**
 * Program type definition based on the Convex database schema
 * Represents an academic program offered by the university
 * Note: Code fields are optional and required based on 'language' field:
 * - language="es" → code is required
 * - language="en" → codeEn is required
 * - language="both" → both code and codeEn are required
 */
export type Program = {
  // Document ID from Convex
  _id: Id<"programs">;

  // Program identification
  codeEs?: string; // Spanish code, required when language is "es" or "both"
  codeEn?: string; // English code, required when language is "en" or "both"
  nameEs?: string; // Spanish name, required when language is "es" or "both"
  nameEn?: string; // English name, required when language is "en" or "both"
  descriptionEs?: string; // Spanish description, required when language is "es" or "both"
  descriptionEn?: string; // English description, required when language is "en" or "both"

  // Program classification
  type: "diploma" | "bachelor" | "master" | "doctorate";
  degree?: string; // "Bachelor of Arts", "Master of Science", etc.
  language: "es" | "en" | "both";

  // Academic requirements
  totalCredits: number;
  durationBimesters: number;

  // Financial information (optional)
  tuitionPerCredit?: number;

  // Status and audit fields
  isActive: boolean;
  createdAt: number;
  updatedAt?: number;
};

/**
 * Form data type for creating/editing programs
 * Allows undefined/empty values for better UX during form filling
 * Validation is performed dynamically based on 'language' selection
 */
export type ProgramFormData = {
  codeEs: string;
  codeEn: string;
  nameEs: string;
  nameEn: string;
  descriptionEs: string;
  descriptionEn: string;
  type: Program["type"] | undefined; // Allow undefined for placeholder state
  degree: string;
  language: Program["language"] | undefined; // Allow undefined for placeholder state
  totalCredits: number;
  durationBimesters: number;
  tuitionPerCredit: number;
  isActive: boolean | undefined; // Allow undefined for placeholder state
};

/**
 * Course type definition based on the Convex database schema
 * Note: Code and language fields are interconnected:
 * - language="es" → code is required (Spanish code)
 * - language="en" → codeEn is required (English code)
 * - language="both" → both code and codeEn are required
 * Name and description fields follow the same pattern
 */
export type Course = {
  _id: Id<"courses">;
  code?: string; // Spanish code, required when language is "es" or "both"
  codeEn?: string; // English code, required when language is "en" or "both"
  nameEs?: string; // Spanish name, required when language is "es" or "both"
  nameEn?: string; // English name, required when language is "en" or "both"
  descriptionEs?: string; // Spanish description, required when language is "es" or "both"
  descriptionEn?: string; // English description, required when language is "en" or "both"

  // Course credits
  credits: number;

  // Course level
  level?: "introductory" | "intermediate" | "advanced" | "graduate";

  // Course language
  language: "es" | "en" | "both";

  // Category for requirements
  category: "humanities" | "core" | "elective" | "general";

  // Prerequisites (course codes)
  prerequisites: string[];
  corequisites?: string[];

  // Additional metadata
  syllabus?: string; // URL or document reference

  isActive: boolean;
  createdAt: number;
  updatedAt?: number;
};

export type Section = {
  _id: Id<"sections">;
  courseId: Id<"courses">;
  periodId: Id<"periods">;
  groupNumber: string;
  crn: string; // Course Reference Number
  professorId: Id<"users">;
  capacity: number;
  enrolled: number;
  waitlistCapacity?: number;
  waitlisted?: number;
  deliveryMethod: "online_sync" | "online_async" | "in_person" | "hybrid";
  schedule?: {
    sessions: {
      day:
        | "monday"
        | "tuesday"
        | "wednesday"
        | "thursday"
        | "friday"
        | "saturday"
        | "sunday";
      startTime: string;
      endTime: string;
      roomUrl?: string;
    }[];
    timezone: string;
    notes?: string;
  };

  status: "draft" | "open" | "closed" | "active" | "grading" | "completed";
  gradesSubmitted: boolean;
  gradesSubmittedAt?: number;
  isActive: boolean;
  createdAt: number;
  updatedAt?: number;
};

export type Period = {
  _id: Id<"periods">;
  code: string;
  year: number;
  bimester: number;
  nameEs: string;
  nameEn?: string;
  startDate: number;
  endDate: number;
  enrollmentStart: number;
  enrollmentEnd: number;
  addDropDeadline?: number;
  withdrawalDeadline?: number;
  graddingStart?: number;
  graddingDeadline: number;
  status: "planning" | "enrollment" | "active" | "grading" | "closed";
  isCurrentPeriod: boolean;
  createdAt: number;
  updatedAt?: number;
};

export type Enrollment = {
  _id: Id<"enrollments">;
  studentId: Id<"users">;
  sectionId: Id<"sections">;
  periodId: Id<"periods">;
  courseId: Id<"courses">;
  professorId: Id<"users">;
  enrolledAt: number;
  enrolledBy?: Id<"users">;
  status:
    | "enrolled"
    | "withdrawn"
    | "dropped"
    | "completed"
    | "failed"
    | "incomplete"
    | "in_progress";
  statusChangedAt?: number;
  statusChangedBy?: Id<"users">;
  statusChangeReason?: string;
  percentageGrade?: number; // 0-100
  letterGrade?: string; // A+, A, A-, B+, etc.
  gradePoints?: number; // 4.0 scale
  qualityPoints?: number; // gradePoints * credits
  gradedBy?: Id<"users">;
  gradedAt?: number;
  gradeNotes?: string;
  lastGradeUpdate?: number;
  isRetake: boolean;
  isAuditing: boolean;
  countsForGPA: boolean;
  countsForProgress: boolean;
  incompleteDeadline?: number;
  createdAt: number;
  updatedAt?: number;
};

/**
 * Student type definition based on the Convex database schema
 * Represents a student user with their profile information
 */
export type Student = {
  // Document ID from Convex
  _id: Id<"users">;

  // Authentication
  clerkId: string;
  email: string;

  // Personal information
  firstName: string;
  lastName: string;

  // Additional fields for certificates
  dateOfBirth?: number;
  nationality?: string;
  documentType?: "passport" | "national_id" | "driver_license" | "other";
  documentNumber?: string;

  // Contact
  phone?: string;
  country?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };

  // System fields
  role: "student";
  isActive: boolean;
  createdBy?: Id<"users">;
  createdAt: number;
  updatedAt?: number;
  lastLoginAt?: number;

  // Student-specific profile
  studentProfile: {
    studentCode: string;
    programId: Id<"programs">;
    enrollmentDate: number;
    expectedGraduationDate?: number;
    status: "active" | "inactive" | "on_leave" | "graduated" | "withdrawn";
    academicStanding?: "good_standing" | "probation" | "suspension";
  };
};

/**
 * Professor type definition based on the Convex database schema
 * Represents a professor user with their profile information
 */
export type Professor = {
  // Document ID from Convex
  _id: Id<"users">;

  // Authentication
  clerkId: string;
  email: string;

  // Personal information
  firstName: string;
  lastName: string;

  // Additional fields for certificates
  dateOfBirth?: number;
  nationality?: string;
  documentType?: "passport" | "national_id" | "driver_license" | "other";
  documentNumber?: string;

  // Contact
  phone?: string;
  country?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };

  // System fields
  role: "professor";
  isActive: boolean;
  createdBy?: Id<"users">;
  createdAt: number;
  updatedAt?: number;
  lastLoginAt?: number;

  // Professor-specific profile
  professorProfile: {
    employeeCode: string;
    title?: string;
    department?: string;
    hireDate?: number;
  };
};
