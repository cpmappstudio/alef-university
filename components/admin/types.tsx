import { Id } from "@/convex/_generated/dataModel";

/**
 * Program type definition based on the Convex database schema
 * Represents an academic program offered by the university
 */
export type Program = {
  // Document ID from Convex
  _id: Id<"programs">;

  // Program identification
  code: string;
  nameEs: string;
  nameEn?: string;
  descriptionEs: string;
  descriptionEn?: string;

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
 */
export type ProgramFormData = {
  code: string;
  nameEs: string;
  nameEn: string;
  descriptionEs: string;
  descriptionEn: string;
  type: Program['type'] | undefined; // Allow undefined for placeholder state
  degree: string;
  language: Program['language'] | undefined; // Allow undefined for placeholder state
  totalCredits: number;
  durationBimesters: number;
  tuitionPerCredit: number;
  isActive: boolean;
};

export type Course = {
  _id: Id<"courses">;
  code: string;
  nameEs: string;
  nameEn?: string;
  descriptionEs: string;
  descriptionEn?: string;

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
  status: "planning"|"enrollment"|"active"|"grading"|"closed";
  isCurrentPeriod: boolean;
  createdAt: number;
  updatedAt?: number;
}