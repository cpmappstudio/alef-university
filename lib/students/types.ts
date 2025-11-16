import type { ReactNode } from "react";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import type { UserRole } from "@/convex/types";

export type StudentProfile = {
  studentCode: string;
  programId: Id<"programs">;
};

export type StudentDocument = Pick<
  Doc<"users">,
  | "_id"
  | "clerkId"
  | "firstName"
  | "lastName"
  | "email"
  | "phone"
  | "country"
  | "dateOfBirth"
  | "nationality"
  | "documentType"
  | "documentNumber"
  | "isActive"
  | "role"
  | "studentProfile"
>;

export type StudentManagementClientProps = {
  students: StudentDocument[];
};

export type StudentDetailClientProps = {
  studentId: Id<"users">;
  initialStudent?: Doc<"users"> | null;
  initialProgram?: Doc<"programs"> | null;
  userRole?: UserRole | null;
};

export type StudentFormDialogMode = "create" | "edit";

export type StudentFormState = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  country: string;
  dateOfBirth?: string;
  nationality?: string;
  documentType?: "passport" | "national_id" | "driver_license" | "other";
  documentNumber?: string;
  studentCode: string;
  programId: string;
  isActive: boolean;
};

export type StudentFormErrorKey =
  | "firstName"
  | "lastName"
  | "email"
  | "studentCode"
  | "programId";

export type StudentFormErrors = Partial<Record<StudentFormErrorKey, string>>;

export type StudentFormDialogProps = {
  mode: StudentFormDialogMode;
  student?: StudentDocument | null;
  trigger?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export type StudentCreatePayload = {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  country?: string;
  dateOfBirth?: number;
  nationality?: string;
  documentType?: "passport" | "national_id" | "driver_license" | "other";
  documentNumber?: string;
  studentProfile: {
    studentCode: string;
    programId: Id<"programs">;
  };
  isActive: boolean;
};

export type StudentUpdatePayload = StudentCreatePayload & {
  clerkId: string;
};
