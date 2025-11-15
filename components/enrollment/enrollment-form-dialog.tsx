"use client";

import * as React from "react";
import { Save, Trash2, Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { Enrollment } from "../types";
import { Id } from "@/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

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
  const [studentComboboxOpen, setStudentComboboxOpen] = React.useState(false);

  // Use controlled or internal state
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = onOpenChange || setInternalOpen;

  const createEnrollment = useMutation(api.admin.createEnrollment);
  const updateEnrollment = useMutation(api.admin.updateEnrollment);
  const deleteEnrollment = useMutation(api.admin.deleteEnrollment);

  const students = useQuery(api.admin.getAllUsers, { role: "student" });
  const courses = useQuery(api.courses.getAllCourses, {});
  const sections = useQuery(api.admin.adminGetSections, {});
  const periods = useQuery(api.admin.getAllPeriods, {});
  const professors = useQuery(api.admin.getAllUsers, { role: "professor" });

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

  // Auto-populate professor when section is selected
  React.useEffect(() => {
    if (formData.sectionId && sections) {
      const selectedSection = sections.find(s => s._id === formData.sectionId);
      if (selectedSection) {
        setFormData(prev => ({
          ...prev,
          professorId: selectedSection.professorId,
        }));
      }
    }
  }, [formData.sectionId, sections]);

  // Auto-populate status based on period
  React.useEffect(() => {
    if (formData.periodId && periods && periods.length > 0) {
      const selectedPeriod = periods.find(p => p._id === formData.periodId);
      if (selectedPeriod && selectedPeriod.status) {
        let enrollmentStatus: EnrollmentFormData["status"] = undefined;

        // Map period status to enrollment status
        switch (selectedPeriod.status) {
          case "enrollment":
            enrollmentStatus = "enrolled";
            break;
          case "active":
            enrollmentStatus = "in_progress";
            break;
          case "grading":
            enrollmentStatus = "in_progress";
            break;
          case "closed":
            enrollmentStatus = "completed";
            break;
          case "planning":
            enrollmentStatus = "enrolled"; // Default to enrolled for planning phase
            break;
          default:
            enrollmentStatus = "enrolled"; // Default fallback
        }

        setFormData(prev => ({
          ...prev,
          status: enrollmentStatus,
        }));
      }
    }
  }, [formData.periodId, periods]);

  // Filter sections based on course and period
  const filteredSections = React.useMemo(() => {
    if (!sections) return [];
    return sections.filter(section => {
      const matchesCourse = formData.courseId ? section.courseId === formData.courseId : true;
      const matchesPeriod = formData.periodId ? section.periodId === formData.periodId : true;
      return matchesCourse && matchesPeriod;
    });
  }, [sections, formData.courseId, formData.periodId]);

  const handleSubmit = async (e: React.FormEvent) => {
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
      if (mode === "create") {
        await createEnrollment({
          studentId: formData.studentId,
          sectionId: formData.sectionId,
          periodId: formData.periodId,
          courseId: formData.courseId,
          professorId: formData.professorId,
          status: formData.status,
          statusChangeReason: formData.statusChangeReason || undefined,
          percentageGrade: formData.percentageGrade,
          letterGrade: formData.letterGrade || undefined,
          gradePoints: formData.gradePoints,
          gradeNotes: formData.gradeNotes || undefined,
          isRetake: formData.isRetake,
          isAuditing: formData.isAuditing,
          countsForGPA: formData.countsForGPA,
          countsForProgress: formData.countsForProgress,
          incompleteDeadline: formData.incompleteDeadline,
        });
        alert("Enrollment created successfully!");
      } else {
        if (!enrollment) return;

        await updateEnrollment({
          enrollmentId: enrollment._id,
          status: formData.status,
          statusChangeReason: formData.statusChangeReason || undefined,
          percentageGrade: formData.percentageGrade,
          letterGrade: formData.letterGrade || undefined,
          gradePoints: formData.gradePoints,
          gradeNotes: formData.gradeNotes || undefined,
          isRetake: formData.isRetake,
          isAuditing: formData.isAuditing,
          countsForGPA: formData.countsForGPA,
          countsForProgress: formData.countsForProgress,
          incompleteDeadline: formData.incompleteDeadline,
        });
        alert("Enrollment updated successfully!");
      }

      setOpen(false);
    } catch (error) {
      console.error(`Failed to ${mode} enrollment:`, error);
      alert(`Failed to ${mode} enrollment: ${(error as Error).message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!enrollment) return;

    const confirmed = window.confirm(
      "Are you sure you want to delete this enrollment? This action cannot be undone."
    );

    if (!confirmed) return;

    setIsDeleting(true);

    try {
      await deleteEnrollment({ enrollmentId: enrollment._id });
      alert("Enrollment deleted successfully!");
      setOpen(false);
    } catch (error) {
      console.error("Failed to delete enrollment:", error);
      alert(`Failed to delete enrollment: ${(error as Error).message}`);
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
    if (students === undefined || courses === undefined || sections === undefined || periods === undefined) return null;

    const currentStudentId = mode === "edit" ? enrollment?.studentId : formData.studentId;
    const currentCourseId = mode === "edit" ? enrollment?.courseId : formData.courseId;
    const currentSectionId = mode === "edit" ? enrollment?.sectionId : formData.sectionId;
    const currentPeriodId = mode === "edit" ? enrollment?.periodId : formData.periodId;

    const student = students.find((s) => s._id === currentStudentId);
    const course = courses.find((c) => c._id === currentCourseId);
    const section = sections.find((s) => s._id === currentSectionId);
    const period = periods.find((p) => p._id === currentPeriodId);

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
                  <Popover open={studentComboboxOpen} onOpenChange={setStudentComboboxOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={studentComboboxOpen}
                        className="w-full  justify-between border-border focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
                      >
                        {formData.studentId && students
                          ? students.find((student) => student._id === formData.studentId)
                            ? `${students.find((student) => student._id === formData.studentId)?.firstName} ${students.find((student) => student._id === formData.studentId)?.lastName}`
                            : "Select student..."
                          : "Select student..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Search student..." className="h-9" />
                        <CommandList>
                          <CommandEmpty>No student found.</CommandEmpty>
                          <CommandGroup>
                            {students === undefined ? (
                              <div className="py-2 px-3 text-sm text-muted-foreground">Loading students...</div>
                            ) : students.length === 0 ? (
                              <div className="py-2 px-3 text-sm text-muted-foreground">No students available</div>
                            ) : (
                              students.map((student) => (
                                <CommandItem
                                  key={student._id}
                                  value={`${student.firstName} ${student.lastName}`}
                                  onSelect={() => {
                                    updateFormData("studentId", student._id);
                                    setStudentComboboxOpen(false);
                                  }}
                                >
                                  {student.firstName} {student.lastName}
                                  <Check
                                    className={cn(
                                      "ml-auto h-4 w-4",
                                      formData.studentId === student._id
                                        ? "opacity-100"
                                        : "opacity-0"
                                    )}
                                  />
                                </CommandItem>
                              ))
                            )}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
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
                    <SelectTrigger className="w-full  border-border focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200">
                      <SelectValue placeholder="Select period" />
                    </SelectTrigger>
                    <SelectContent className="bg-background border-border shadow-lg">
                      {periods === undefined ? (
                        <div className="py-2 px-3 text-sm text-muted-foreground">Loading periods...</div>
                      ) : periods.length === 0 ? (
                        <div className="py-2 px-3 text-sm text-muted-foreground">No periods available</div>
                      ) : (
                        periods.map((period) => (
                          <SelectItem
                            key={period._id}
                            value={period._id}
                            className="hover:bg-muted/80"
                          >
                            {period.code} - {period.nameEs}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                    <SelectTrigger className="w-full  border-border focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200">
                      <SelectValue placeholder="Select course" />
                    </SelectTrigger>
                    <SelectContent className="bg-background border-border shadow-lg">
                      {courses === undefined ? (
                        <div className="py-2 px-3 text-sm text-muted-foreground">Loading courses...</div>
                      ) : courses.length === 0 ? (
                        <div className="py-2 px-3 text-sm text-muted-foreground">No courses available</div>
                      ) : (
                        courses.map((course) => (
                          <SelectItem
                            key={course._id}
                            value={course._id}
                            className="hover:bg-muted/80"
                          >
                            {course.code} - {course.nameEs}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

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
                    disabled={!formData.courseId || !formData.periodId}
                  >
                    <SelectTrigger className="w-full  border-border focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200">
                      <SelectValue placeholder={
                        !formData.courseId || !formData.periodId
                          ? "Select course and period first"
                          : "Select section"
                      } />
                    </SelectTrigger>
                    <SelectContent className="bg-background border-border shadow-lg">
                      {sections === undefined ? (
                        <div className="py-2 px-3 text-sm text-muted-foreground">Loading sections...</div>
                      ) : filteredSections.length === 0 ? (
                        <div className="py-2 px-3 text-sm text-muted-foreground">
                          No sections available for this course and period
                        </div>
                      ) : (
                        filteredSections.map((section) => (
                          <SelectItem
                            key={section._id}
                            value={section._id}
                            className="hover:bg-muted/80"
                          >
                            {section.groupNumber}
                          </SelectItem>
                        ))
                      )}
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
                    Professor <span className="text-muted-foreground text-xs">(Auto-populated)</span>
                  </Label>
                  <Input
                    id="professor"
                    value={
                      formData.professorId && professors
                        ? professors.find((p) => p._id === formData.professorId)
                          ? `${professors.find((p) => p._id === formData.professorId)?.firstName} ${professors.find((p) => p._id === formData.professorId)?.lastName}`
                          : "Not assigned"
                        : "Select a section first"
                    }
                    disabled
                    className="w-full  border-border bg-muted/50 cursor-not-allowed transition-all duration-200"
                  />
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="status"
                    className="text-sm font-semibold text-foreground"
                  >
                    Status <span className="text-muted-foreground text-xs">(Auto-populated)</span>
                  </Label>
                  <Input
                    id="status"
                    value={
                      formData.status
                        ? formData.status.charAt(0).toUpperCase() + formData.status.slice(1).replace("_", " ")
                        : "Select a period first"
                    }
                    disabled
                    className="w-full border-border bg-muted/50 cursor-not-allowed transition-all duration-200"
                  />
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
                    className=" border-border focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
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
                    className=" border-border focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
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
                    className=" border-border focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
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
          </div>
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
                  {entityDetails?.student && (
                    <div className="flex items-center justify-between p-4 border border-border rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                      <div className="space-y-1">
                        <div className="flex items-center gap-3">
                          <span className="font-semibold text-foreground">
                            {entityDetails.student.firstName} {entityDetails.student.lastName}
                          </span>
                        </div>
                        <p className="text-sm text-foreground">
                          {entityDetails.student.email || "No email"}
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
                  {entityDetails?.course && (
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
                  {entityDetails?.section && (
                    <div className="flex items-center justify-between p-4 border border-border rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                      <div className="space-y-1">
                        <div className="flex items-center gap-3">
                          <span className="font-semibold text-foreground">
                            Section {entityDetails.section.groupNumber}
                          </span>
                        </div>
                        <p className="text-sm text-foreground">
                          {courses?.find(c => c._id === entityDetails.section?.courseId)?.code || "N/A"}
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
                  {entityDetails?.period && (
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
          type="button"
          variant="default"
          onClick={handleSubmit}
          disabled={isLoading || isDeleting}
          className="px-6 py-2.5"
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
