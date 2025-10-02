"use client";

import * as React from "react";
import { Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Enrollment } from "../types";
import { Id } from "@/convex/_generated/dataModel";

// Enrollment form data type for handling form state
export type EnrollmentFormData = {
  studentId: Id<"users"> | undefined;
  sectionId: Id<"sections"> | undefined;
  periodId: Id<"periods"> | undefined;
  courseId: Id<"courses"> | undefined;
  professorId: Id<"users"> | undefined;
  enrolledAt: number;
  enrolledBy: Id<"users"> | undefined;
  status:
    | "enrolled"
    | "withdrawn"
    | "dropped"
    | "completed"
    | "failed"
    | "incomplete"
    | "in_progress"
    | undefined;
  statusChangedAt: number | undefined;
  statusChangedBy: Id<"users"> | undefined;
  statusChangeReason: string;
  percentageGrade: number | undefined;
  letterGrade: string;
  gradePoints: number | undefined;
  qualityPoints: number | undefined;
  gradedBy: Id<"users"> | undefined;
  gradedAt: number | undefined;
  gradeNotes: string;
  lastGradeUpdate: number | undefined;
  isRetake: boolean;
  isAuditing: boolean;
  countsForGPA: boolean;
  countsForProgress: boolean;
  incompleteDeadline: number | undefined;
};

interface EnrollmentFormDialogProps {
  mode: "create" | "edit";
  enrollment?: Enrollment;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function EnrollmentFormDialog({
  mode,
  enrollment,
  trigger,
  open: controlledOpen,
  onOpenChange,
}: EnrollmentFormDialogProps) {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState("general");

  // Use controlled or internal state
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = onOpenChange || setInternalOpen;

  // Mock data for demo purposes
  const mockStudents = [
    {
      _id: "student1" as Id<"users">,
      name: "María García",
      email: "maria.garcia@alef.edu",
    },
    {
      _id: "student2" as Id<"users">,
      name: "Juan Pérez",
      email: "juan.perez@alef.edu",
    },
    {
      _id: "student3" as Id<"users">,
      name: "Ana López",
      email: "ana.lopez@alef.edu",
    },
  ];

  const mockCourses = [
    {
      _id: "course1" as Id<"courses">,
      code: "MATH101",
      nameEs: "Matemáticas Básicas",
    },
    {
      _id: "course2" as Id<"courses">,
      code: "HIST201",
      nameEs: "Historia Universal",
    },
    {
      _id: "course3" as Id<"courses">,
      code: "ENG301",
      nameEs: "Inglés Avanzado",
    },
  ];

  const mockSections = [
    {
      _id: "section1" as Id<"sections">,
      groupNumber: "A01",
      courseId: "course1" as Id<"courses">,
    },
    {
      _id: "section2" as Id<"sections">,
      groupNumber: "B02",
      courseId: "course2" as Id<"courses">,
    },
    {
      _id: "section3" as Id<"sections">,
      groupNumber: "C03",
      courseId: "course3" as Id<"courses">,
    },
  ];

  const mockPeriods = [
    {
      _id: "period1" as Id<"periods">,
      code: "2025-1",
      nameEs: "Primer Bimestre 2025",
    },
    {
      _id: "period2" as Id<"periods">,
      code: "2025-2",
      nameEs: "Segundo Bimestre 2025",
    },
    {
      _id: "period3" as Id<"periods">,
      code: "2024-6",
      nameEs: "Sexto Bimestre 2024",
    },
  ];

  const mockProfessors = [
    { _id: "prof1" as Id<"users">, name: "Dr. Elena Vásquez" },
    { _id: "prof2" as Id<"users">, name: "Prof. Miguel Santos" },
    { _id: "prof3" as Id<"users">, name: "Dra. Carmen Flores" },
  ];

  // Initialize form data based on mode and enrollment
  const initialFormData = React.useMemo((): EnrollmentFormData => {
    if (mode === "edit" && enrollment) {
      return {
        studentId: enrollment.studentId,
        sectionId: enrollment.sectionId,
        periodId: enrollment.periodId,
        courseId: enrollment.courseId,
        professorId: enrollment.professorId,
        enrolledAt: enrollment.enrolledAt,
        enrolledBy: enrollment.enrolledBy,
        status: enrollment.status,
        statusChangedAt: enrollment.statusChangedAt,
        statusChangedBy: enrollment.statusChangedBy,
        statusChangeReason: enrollment.statusChangeReason || "",
        percentageGrade: enrollment.percentageGrade,
        letterGrade: enrollment.letterGrade || "",
        gradePoints: enrollment.gradePoints,
        qualityPoints: enrollment.qualityPoints,
        gradedBy: enrollment.gradedBy,
        gradedAt: enrollment.gradedAt,
        gradeNotes: enrollment.gradeNotes || "",
        lastGradeUpdate: enrollment.lastGradeUpdate,
        isRetake: enrollment.isRetake,
        isAuditing: enrollment.isAuditing,
        countsForGPA: enrollment.countsForGPA,
        countsForProgress: enrollment.countsForProgress,
        incompleteDeadline: enrollment.incompleteDeadline,
      };
    } else {
      return {
        studentId: undefined,
        sectionId: undefined,
        periodId: undefined,
        courseId: undefined,
        professorId: undefined,
        enrolledAt: Date.now(),
        enrolledBy: undefined,
        status: undefined,
        statusChangedAt: undefined,
        statusChangedBy: undefined,
        statusChangeReason: "",
        percentageGrade: undefined,
        letterGrade: "",
        gradePoints: undefined,
        qualityPoints: undefined,
        gradedBy: undefined,
        gradedAt: undefined,
        gradeNotes: "",
        lastGradeUpdate: undefined,
        isRetake: false,
        isAuditing: false,
        countsForGPA: true,
        countsForProgress: true,
        incompleteDeadline: undefined,
      };
    }
  }, [mode, enrollment]);

  const [formData, setFormData] = React.useState(initialFormData);

  // Reset form when enrollment changes or dialog opens
  React.useEffect(() => {
    if (open) {
      setFormData(initialFormData);
    }
  }, [open, initialFormData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Basic validation
    if (
      !formData.studentId ||
      !formData.sectionId ||
      !formData.periodId ||
      !formData.courseId ||
      !formData.status
    ) {
      alert("Please fill in all required fields.");
      return;
    }

    setIsLoading(true);

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      if (mode === "create") {
        console.log("Creating enrollment:", formData);
        alert("Enrollment created successfully!");
      } else {
        console.log("Updating enrollment:", formData);
        alert("Enrollment updated successfully!");
      }

      setOpen(false);
    } catch (error) {
      console.error(`Failed to ${mode} enrollment:`, error);
      alert(`Failed to ${mode} enrollment. Please try again.`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!enrollment) return;

    const confirmed = window.confirm(
      "Are you sure you want to delete this enrollment? This action cannot be undone.",
    );

    if (!confirmed) return;

    setIsDeleting(true);

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      console.log("Deleting enrollment:", enrollment._id);
      alert("Enrollment deleted successfully!");
      setOpen(false);
    } catch (error) {
      console.error("Failed to delete enrollment:", error);
      alert("Failed to delete enrollment. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  const updateFormData = (
    field: string,
    value: string | boolean | number | undefined,
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const dialogTitle =
    mode === "create" ? "Create New Enrollment" : "Edit Enrollment";
  const dialogDescription =
    mode === "create"
      ? "Fill in the enrollment information below"
      : "Update the enrollment information below";

  // Get related entity information for Details tab
  const getEntityDetails = () => {
    if (!enrollment && mode !== "edit") return null;

    const currentStudentId =
      mode === "edit" ? enrollment?.studentId : formData.studentId;
    const currentCourseId =
      mode === "edit" ? enrollment?.courseId : formData.courseId;
    const currentSectionId =
      mode === "edit" ? enrollment?.sectionId : formData.sectionId;
    const currentPeriodId =
      mode === "edit" ? enrollment?.periodId : formData.periodId;

    const student = mockStudents.find((s) => s._id === currentStudentId);
    const course = mockCourses.find((c) => c._id === currentCourseId);
    const section = mockSections.find((s) => s._id === currentSectionId);
    const period = mockPeriods.find((p) => p._id === currentPeriodId);

    return { student, course, section, period };
  };

  const entityDetails = getEntityDetails();

  const dialogContent = (
    <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto bg-background border-border shadow-2xl">
      <DialogHeader className="space-y-4 pb-4 border-b border-border">
        <DialogTitle className="text-2xl font-bold text-center text-foreground flex items-center justify-center gap-3">
          {dialogTitle}
        </DialogTitle>
        <DialogDescription className="text-center text-muted-foreground text-base">
          {dialogDescription}
        </DialogDescription>
      </DialogHeader>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="details" disabled={mode === "create"}>
            Details
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6 mt-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-8 py-2">
              {/* Basic Enrollment Information */}
              <div className="space-y-6">
                <div className="flex items-center gap-3 pb-3 border-b border-border/50">
                  <div className="w-2 h-2 rounded-full bg-deep-koamaru"></div>
                  <h3 className="text-lg font-semibold text-foreground">
                    Basic Enrollment Information
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label
                      htmlFor="student"
                      className="text-sm font-semibold text-foreground"
                    >
                      Student <span className="text-destructive">*</span>
                    </Label>
                    <Select
                      value={formData.studentId || ""}
                      onValueChange={(value) =>
                        updateFormData("studentId", value as Id<"users">)
                      }
                    >
                      <SelectTrigger className="w-full h-11 border-border focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200">
                        <SelectValue placeholder="Select student" />
                      </SelectTrigger>
                      <SelectContent className="bg-background border-border shadow-lg">
                        {mockStudents.map((student) => (
                          <SelectItem
                            key={student._id}
                            value={student._id}
                            className="hover:bg-muted/80"
                          >
                            {student.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="course"
                      className="text-sm font-semibold text-foreground"
                    >
                      Course <span className="text-destructive">*</span>
                    </Label>
                    <Select
                      value={formData.courseId || ""}
                      onValueChange={(value) =>
                        updateFormData("courseId", value as Id<"courses">)
                      }
                    >
                      <SelectTrigger className="w-full h-11 border-border focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200">
                        <SelectValue placeholder="Select course" />
                      </SelectTrigger>
                      <SelectContent className="bg-background border-border shadow-lg">
                        {mockCourses.map((course) => (
                          <SelectItem
                            key={course._id}
                            value={course._id}
                            className="hover:bg-muted/80"
                          >
                            {course.code} - {course.nameEs}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label
                      htmlFor="section"
                      className="text-sm font-semibold text-foreground"
                    >
                      Section <span className="text-destructive">*</span>
                    </Label>
                    <Select
                      value={formData.sectionId || ""}
                      onValueChange={(value) =>
                        updateFormData("sectionId", value as Id<"sections">)
                      }
                    >
                      <SelectTrigger className="w-full h-11 border-border focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200">
                        <SelectValue placeholder="Select section" />
                      </SelectTrigger>
                      <SelectContent className="bg-background border-border shadow-lg">
                        {mockSections.map((section) => (
                          <SelectItem
                            key={section._id}
                            value={section._id}
                            className="hover:bg-muted/80"
                          >
                            {section.groupNumber}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="period"
                      className="text-sm font-semibold text-foreground"
                    >
                      Period <span className="text-destructive">*</span>
                    </Label>
                    <Select
                      value={formData.periodId || ""}
                      onValueChange={(value) =>
                        updateFormData("periodId", value as Id<"periods">)
                      }
                    >
                      <SelectTrigger className="w-full h-11 border-border focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200">
                        <SelectValue placeholder="Select period" />
                      </SelectTrigger>
                      <SelectContent className="bg-background border-border shadow-lg">
                        {mockPeriods.map((period) => (
                          <SelectItem
                            key={period._id}
                            value={period._id}
                            className="hover:bg-muted/80"
                          >
                            {period.code} - {period.nameEs}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label
                      htmlFor="professor"
                      className="text-sm font-semibold text-foreground"
                    >
                      Professor <span className="text-destructive">*</span>
                    </Label>
                    <Select
                      value={formData.professorId || ""}
                      onValueChange={(value) =>
                        updateFormData("professorId", value as Id<"users">)
                      }
                    >
                      <SelectTrigger className="w-full h-11 border-border focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200">
                        <SelectValue placeholder="Select professor" />
                      </SelectTrigger>
                      <SelectContent className="bg-background border-border shadow-lg">
                        {mockProfessors.map((professor) => (
                          <SelectItem
                            key={professor._id}
                            value={professor._id}
                            className="hover:bg-muted/80"
                          >
                            {professor.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="status"
                      className="text-sm font-semibold text-foreground"
                    >
                      Status <span className="text-destructive">*</span>
                    </Label>
                    <Select
                      value={formData.status || ""}
                      onValueChange={(value) => updateFormData("status", value)}
                    >
                      <SelectTrigger className="w-full h-11 border-border focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent className="bg-background border-border shadow-lg">
                        <SelectItem
                          value="enrolled"
                          className="hover:bg-muted/80"
                        >
                          Enrolled
                        </SelectItem>
                        <SelectItem
                          value="in_progress"
                          className="hover:bg-muted/80"
                        >
                          In Progress
                        </SelectItem>
                        <SelectItem
                          value="completed"
                          className="hover:bg-muted/80"
                        >
                          Completed
                        </SelectItem>
                        <SelectItem
                          value="failed"
                          className="hover:bg-muted/80"
                        >
                          Failed
                        </SelectItem>
                        <SelectItem
                          value="withdrawn"
                          className="hover:bg-muted/80"
                        >
                          Withdrawn
                        </SelectItem>
                        <SelectItem
                          value="dropped"
                          className="hover:bg-muted/80"
                        >
                          Dropped
                        </SelectItem>
                        <SelectItem
                          value="incomplete"
                          className="hover:bg-muted/80"
                        >
                          Incomplete
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Academic Information */}
              <div className="space-y-6">
                <div className="flex items-center gap-3 pb-3 border-b border-border/50">
                  <div className="w-2 h-2 rounded-full bg-deep-koamaru"></div>
                  <h3 className="text-lg font-semibold text-foreground">
                    Academic Information
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label
                      htmlFor="percentageGrade"
                      className="text-sm font-semibold text-foreground"
                    >
                      Percentage Grade (0-100)
                    </Label>
                    <Input
                      id="percentageGrade"
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={formData.percentageGrade || ""}
                      onChange={(e) =>
                        updateFormData(
                          "percentageGrade",
                          e.target.value
                            ? parseFloat(e.target.value)
                            : undefined,
                        )
                      }
                      placeholder="Enter percentage"
                      className="h-11 border-border focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="letterGrade"
                      className="text-sm font-semibold text-foreground"
                    >
                      Letter Grade
                    </Label>
                    <Input
                      id="letterGrade"
                      value={formData.letterGrade}
                      onChange={(e) =>
                        updateFormData("letterGrade", e.target.value)
                      }
                      placeholder="e.g., A+, A, A-, B+"
                      className="h-11 border-border focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="gradePoints"
                      className="text-sm font-semibold text-foreground"
                    >
                      Grade Points (4.0 scale)
                    </Label>
                    <Input
                      id="gradePoints"
                      type="number"
                      min="0"
                      max="4"
                      step="0.01"
                      value={formData.gradePoints || ""}
                      onChange={(e) =>
                        updateFormData(
                          "gradePoints",
                          e.target.value
                            ? parseFloat(e.target.value)
                            : undefined,
                        )
                      }
                      placeholder="e.g., 3.67"
                      className="h-11 border-border focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="gradeNotes"
                    className="text-sm font-semibold text-foreground"
                  >
                    Grade Notes
                  </Label>
                  <Textarea
                    id="gradeNotes"
                    value={formData.gradeNotes}
                    onChange={(e) =>
                      updateFormData("gradeNotes", e.target.value)
                    }
                    placeholder="Additional notes about the grade..."
                    className="min-h-[80px] border-border focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
                  />
                </div>
              </div>

              {/* Status Information */}
              <div className="space-y-6">
                <div className="flex items-center gap-3 pb-3 border-b border-border/50">
                  <div className="w-2 h-2 rounded-full bg-deep-koamaru"></div>
                  <h3 className="text-lg font-semibold text-foreground">
                    Status Information
                  </h3>
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="statusChangeReason"
                    className="text-sm font-semibold text-foreground"
                  >
                    Status Change Reason
                  </Label>
                  <Textarea
                    id="statusChangeReason"
                    value={formData.statusChangeReason}
                    onChange={(e) =>
                      updateFormData("statusChangeReason", e.target.value)
                    }
                    placeholder="Reason for status change..."
                    className="min-h-[80px] border-border focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        id="isRetake"
                        checked={formData.isRetake}
                        onChange={(e) =>
                          updateFormData("isRetake", e.target.checked)
                        }
                        className="h-5 w-5 rounded border-border text-primary focus:ring-2 focus:ring-primary/20"
                      />
                      <Label
                        htmlFor="isRetake"
                        className="text-sm font-semibold text-foreground cursor-pointer"
                      >
                        Is Retake
                      </Label>
                    </div>

                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        id="isAuditing"
                        checked={formData.isAuditing}
                        onChange={(e) =>
                          updateFormData("isAuditing", e.target.checked)
                        }
                        className="h-5 w-5 rounded border-border text-primary focus:ring-2 focus:ring-primary/20"
                      />
                      <Label
                        htmlFor="isAuditing"
                        className="text-sm font-semibold text-foreground cursor-pointer"
                      >
                        Is Auditing
                      </Label>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        id="countsForGPA"
                        checked={formData.countsForGPA}
                        onChange={(e) =>
                          updateFormData("countsForGPA", e.target.checked)
                        }
                        className="h-5 w-5 rounded border-border text-primary focus:ring-2 focus:ring-primary/20"
                      />
                      <Label
                        htmlFor="countsForGPA"
                        className="text-sm font-semibold text-foreground cursor-pointer"
                      >
                        Counts for GPA
                      </Label>
                    </div>

                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        id="countsForProgress"
                        checked={formData.countsForProgress}
                        onChange={(e) =>
                          updateFormData("countsForProgress", e.target.checked)
                        }
                        className="h-5 w-5 rounded border-border text-primary focus:ring-2 focus:ring-primary/20"
                      />
                      <Label
                        htmlFor="countsForProgress"
                        className="text-sm font-semibold text-foreground cursor-pointer"
                      >
                        Counts for Progress
                      </Label>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="incompleteDeadline"
                    className="text-sm font-semibold text-foreground"
                  >
                    Incomplete Deadline
                  </Label>
                  <Input
                    id="incompleteDeadline"
                    type="date"
                    value={
                      formData.incompleteDeadline
                        ? new Date(formData.incompleteDeadline)
                            .toISOString()
                            .split("T")[0]
                        : ""
                    }
                    onChange={(e) =>
                      updateFormData(
                        "incompleteDeadline",
                        e.target.value
                          ? new Date(e.target.value).getTime()
                          : undefined,
                      )
                    }
                    className="h-11 border-border focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
                  />
                </div>
              </div>
            </div>
          </form>
        </TabsContent>

        <TabsContent value="details" className="space-y-6 mt-6">
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3 pb-3 border-b border-border/50">
                <div className="w-2 h-2 rounded-full bg-deep-koamaru"></div>
                <h3 className="text-lg font-semibold text-foreground">
                  Associated Information
                </h3>
              </div>

              {!entityDetails ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">
                    {mode === "create"
                      ? "Select enrollment details in the General tab to view related information here"
                      : "No enrollment data available"}
                  </p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {/* Student Card */}
                  {entityDetails.student && (
                    <div className="flex items-center justify-between p-4 border border-border rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                      <div className="space-y-1">
                        <div className="flex items-center gap-3">
                          <span className="font-semibold text-foreground">
                            {entityDetails.student.name}
                          </span>
                        </div>
                        <p className="text-sm text-foreground">
                          {entityDetails.student.email}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                          Student
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Course Card */}
                  {entityDetails.course && (
                    <div className="flex items-center justify-between p-4 border border-border rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                      <div className="space-y-1">
                        <div className="flex items-center gap-3">
                          <span className="font-semibold text-foreground">
                            {entityDetails.course.code}
                          </span>
                        </div>
                        <p className="text-sm text-foreground">
                          {entityDetails.course.nameEs}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                          Course
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Section Card */}
                  {entityDetails.section && (
                    <div className="flex items-center justify-between p-4 border border-border rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                      <div className="space-y-1">
                        <div className="flex items-center gap-3">
                          <span className="font-semibold text-foreground">
                            Section {entityDetails.section.groupNumber}
                          </span>
                        </div>
                        <p className="text-sm text-foreground">
                          {mockCourses.find(
                            (c) => c._id === entityDetails.section?.courseId,
                          )?.code || "N/A"}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded-full">
                          Section
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Period Card */}
                  {entityDetails.period && (
                    <div className="flex items-center justify-between p-4 border border-border rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                      <div className="space-y-1">
                        <div className="flex items-center gap-3">
                          <span className="font-semibold text-foreground">
                            {entityDetails.period.code}
                          </span>
                        </div>
                        <p className="text-sm text-foreground">
                          {entityDetails.period.nameEs}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded-full">
                          Period
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <DialogFooter className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-border">
        {mode === "edit" && enrollment && (
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={isLoading || isDeleting}
            className="px-6 py-2.5"
          >
            {isDeleting ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Deactivating...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Trash2 className="h-4 w-4" />
                Delete Enrollment
              </div>
            )}
          </Button>
        )}

        <Button
          type="submit"
          variant="default"
          disabled={isLoading || isDeleting}
        >
          {isLoading ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              {mode === "create" ? "Creating..." : "Saving..."}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Save className="h-4 w-4" />
              {mode === "create" ? "Create Enrollment" : "Save Changes"}
            </div>
          )}
        </Button>
      </DialogFooter>
    </DialogContent>
  );

  if (trigger) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>{trigger}</DialogTrigger>
        {dialogContent}
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {dialogContent}
    </Dialog>
  );
}
