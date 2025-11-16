import type { Doc, Id } from "@/convex/_generated/dataModel";

export type ClassDocument = Doc<"classes">;

export type ClassWithRelations = ClassDocument & {
  status: "open" | "active" | "grading" | "completed";
  course: Doc<"courses"> | null;
  bimester: Doc<"bimesters"> | null;
  professor: Doc<"users"> | null;
};

export type ClassEnrollmentRow = Doc<"class_enrollments"> & {
  student?: Doc<"users"> | null;
};

export type ClassDetailClientProps = {
  classId: Id<"classes">;
  initialClass?: ClassWithRelations | null;
  initialEnrollments?: ClassEnrollmentRow[];
  userRole?: string | null;
};
