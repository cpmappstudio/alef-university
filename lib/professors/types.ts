import type { ReactNode } from "react";
import type { Doc, Id } from "@/convex/_generated/dataModel";

export type TeachingHistorySection = {
  _id: Id<"sections">;
  courseCode: string;
  courseName: string;
  groupNumber: string;
  credits: number;
  category: string;
  closingDate: number;
  status: "active" | "closed" | "cancelled";
  enrolledStudents: number;
  completedStudents: number;
  course: any;
  section: any;
  period: any;
};

export type PeriodTeachingSummary = {
  period: {
    _id: Id<"periods">;
    code: string;
    nameEs: string;
    startDate: number;
    endDate: number;
  };
  sections: TeachingHistorySection[];
  totalStudents: number;
  totalCourses: number;
};

export type StudentGradeEntry = {
  _id: Id<"enrollments">;
  studentId: Id<"users">;
  studentName: string;
  studentCode: string;
  percentageGrade?: number;
  letterGrade?: string;
  status: "enrolled" | "completed" | "failed" | "withdrawn" | "dropped";
  notes?: string;
};

export type SectionDetail = {
  _id: Id<"sections">;
  course: {
    _id: Id<"courses">;
    code: string;
    nameEs: string;
    nameEn?: string;
    credits: number;
    category: string;
    descriptionEs?: string;
    prerequisites?: string[];
  };
  section: {
    _id: Id<"sections">;
    groupNumber: string;
    schedule?: {
      sessions: Array<{
        day: string;
        startTime: string;
        endTime: string;
      }>;
      timezone: string;
    };
    maxStudents?: number;
  };
  period: {
    _id: Id<"periods">;
    code: string;
    nameEs: string;
    startDate: number;
    endDate: number;
  };
  students: StudentGradeEntry[];
};

export type ProfessorDocument = Pick<
  Doc<"users">,
  | "_id"
  | "clerkId"
  | "firstName"
  | "lastName"
  | "email"
  | "phone"
  | "country"
  | "isActive"
  | "role"
>;

export type ProfessorManagementClientProps = {
  professors: ProfessorDocument[];
};

export type ProfessorFormState = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  country: string;
  isActive: boolean;
};

export type ProfessorFormErrorKey = "firstName" | "lastName" | "email";
export type ProfessorFormErrors = Partial<
  Record<ProfessorFormErrorKey, string>
>;

export type ProfessorFormValidationMessages = {
  firstNameRequired: string;
  lastNameRequired: string;
  emailRequired: string;
  emailInvalid: string;
};

export type ProfessorFormValidationResult = {
  errors: ProfessorFormErrors;
  isValid: boolean;
};

export type ProfessorFormDialogMode = "create" | "edit";

export type ProfessorFormDialogProps = {
  mode: ProfessorFormDialogMode;
  professor?: ProfessorDocument | null;
  trigger?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export type ProfessorCreatePayload = {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  country?: string;
  isActive: boolean;
};

export type ProfessorUpdatePayload = ProfessorCreatePayload & {
  clerkId: string;
};
