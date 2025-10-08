"use client";

import * as React from "react";
import { Save, Trash2 } from "lucide-react";
import { useMutation, useQuery } from "convex/react";
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
import { api } from "@/convex/_generated/api";
import { Course } from "../types";
import { Textarea } from "@/components/ui/textarea";

interface CourseFormDialogProps {
  mode: "create" | "edit";
  course?: Course;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function CourseFormDialog({
  mode,
  course,
  trigger,
  open: controlledOpen,
  onOpenChange,
}: CourseFormDialogProps) {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState("general");

  // Convex mutations and queries
  const createCourse = useMutation(api.courses.createCourse);
  const updateCourse = useMutation(api.courses.updateCourse);
  const deleteCourse = useMutation(api.courses.deleteCourse);
  const courseWithSections = course ? useQuery(api.courses.getCourseWithSections, {
    courseId: course._id,
  }) : undefined;

  // Use controlled or internal state
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = onOpenChange || setInternalOpen;

  // Initialize form data based on course
  const initialFormData = React.useMemo(() => {
    if (mode === "edit" && course) {
      return {
        nameEs: course.nameEs,
        nameEn: course.nameEn || "",
        descriptionEs: course.descriptionEs,
        descriptionEn: course.descriptionEn || "",
        credits: course.credits,
        level: course.level || "introductory",
        language: course.language,
        category: course.category,
        prerequisites: course.prerequisites.join(", "), // Convert array to comma-separated string
        corequisites: course.corequisites?.join(", ") || "", // Convert array to comma-separated string
        syllabus: course.syllabus || "",
        isActive: course.isActive,
      };
    }
    return {
      nameEs: "",
      nameEn: "",
      descriptionEs: "",
      descriptionEn: "",
      credits: 0,
      level: "introductory",
      language: "es",
      category: "core",
      prerequisites: "",
      corequisites: "",
      syllabus: "",
      isActive: true,
    };
  }, [mode, course]);

  const [formData, setFormData] = React.useState(initialFormData);

  // Reset form when course changes or dialog opens
  React.useEffect(() => {
    if (open) {
      setFormData(initialFormData);
    }
  }, [open, initialFormData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Basic validation
    if (!formData.nameEs || !formData.descriptionEs || formData.credits <= 0) {
      alert("Please fill in all required fields with valid values.");
      return;
    }

    setIsLoading(true);

    try {
      if (mode === "create") {
        await createCourse({
          code: `COURSE${Date.now()}`,
          nameEs: formData.nameEs,
          nameEn: formData.nameEn || undefined,
          descriptionEs: formData.descriptionEs,
          descriptionEn: formData.descriptionEn || undefined,
          credits: formData.credits,
          level: formData.level as "introductory" | "intermediate" | "advanced" | "graduate",
          language: formData.language as "es" | "en" | "both",
          category: formData.category as "humanities" | "core" | "elective" | "general",
          prerequisites: formData.prerequisites
            ? formData.prerequisites.split(',').map(p => p.trim()).filter(p => p)
            : [],
          corequisites: formData.corequisites && formData.corequisites.trim() !== ""
            ? formData.corequisites.split(',').map(p => p.trim()).filter(p => p)
            : undefined,
          syllabus: formData.syllabus.trim() || undefined,
        });
        alert("Course created successfully!");
        setOpen(false);
      } else if (mode === "edit" && course) {
        await updateCourse({
          courseId: course._id,
          nameEs: formData.nameEs,
          nameEn: formData.nameEn || undefined,
          descriptionEs: formData.descriptionEs,
          descriptionEn: formData.descriptionEn || undefined,
          credits: formData.credits,
          level: formData.level as "introductory" | "intermediate" | "advanced" | "graduate",
          language: formData.language as "es" | "en" | "both",
          category: formData.category as "humanities" | "core" | "elective" | "general",
          prerequisites: formData.prerequisites
            ? formData.prerequisites.split(',').map(p => p.trim()).filter(p => p)
            : [],
          corequisites: formData.corequisites && formData.corequisites.trim() !== ""
            ? formData.corequisites.split(',').map(p => p.trim()).filter(p => p)
            : undefined,
          syllabus: formData.syllabus.trim() || undefined,
          isActive: formData.isActive,
        });

        alert("Course updated successfully!");
        setOpen(false);
      }
    } catch (error) {
      console.error("Failed to update course:", error);
      alert("Failed to update course. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const updateFormData = (field: string, value: string | boolean | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Language field enablement logic (same as program-form-dialog.tsx)
  const getFieldEnabledState = () => {
    const language = formData.language;
    const languageEnabled = {
      nameEs: language === "es" || language === "both",
      nameEn: language === "en" || language === "both",
      descriptionEs: language === "es" || language === "both",
      descriptionEn: language === "en" || language === "both",
    };

    // For course editing, apply similar rules as program editing
    return {
      // Name fields: disabled if they already have a value, enabled if empty and language allows
      nameEs:
        languageEnabled.nameEs &&
        (!course?.nameEs || course.nameEs.trim() === ""),
      nameEn:
        languageEnabled.nameEn &&
        (!course?.nameEn || course.nameEn.trim() === ""),
      // Description fields: always follow language rules (always editable when language allows)
      descriptionEs: languageEnabled.descriptionEs,
      descriptionEn: languageEnabled.descriptionEn,
    };
  };

  const handleDelete = async () => {
    if (!course) return;
    if (!confirm(`Are you sure you want to delete the course "${course.nameEs}"? This action cannot be undone.`)) {
      return;
    }
    
    setIsDeleting(true);
    
    try {
      await deleteCourse({ courseId: course._id });
      alert("Course deleted successfully!");
      setOpen(false);
    } catch (error) {
      console.error("Failed to delete course:", error);
      alert(`Failed to delete course: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const fieldEnabled = getFieldEnabledState();

  const dialogTitle = mode === "edit" ? "Edit Course" : "Create Course";
  const dialogDescription = "Update the course information below";

  const dialogContent = (
    <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto bg-background border-border shadow-2xl">
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
          <TabsTrigger value="details">Details</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6 mt-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-8 py-2">
              {/* Basic Information Section */}
              <div className="space-y-6">
                <div className="flex items-center gap-3 pb-3 border-b border-border/50">
                  <div className="w-2 h-2 rounded-full bg-deep-koamaru"></div>
                  <h3 className="text-lg font-semibold text-foreground">
                    Basic Information
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label
                      htmlFor="code"
                      className="text-sm font-semibold text-foreground"
                    >
                      Course Code
                    </Label>
                    <Input
                      id="code"
                      value={course?.code}
                      className="h-11 border-border bg-muted/50 text-muted-foreground"
                      disabled
                      readOnly
                    />
                  </div>
                  <div className="space-y-2">
                    <Label
                      htmlFor="category"
                      className="text-sm font-semibold text-foreground"
                    >
                      Course Category{" "}
                      <span className="text-destructive">*</span>
                    </Label>
                    <Select
                      value={formData.category || ""}
                      onValueChange={(value) =>
                        updateFormData("category", value)
                      }
                    >
                      <SelectTrigger className="w-full h-11 border-border focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200">
                        <SelectValue placeholder="Select course category" />
                      </SelectTrigger>
                      <SelectContent className="bg-background border-border shadow-lg">
                        <SelectItem
                          value="humanities"
                          className="hover:bg-muted/80"
                        >
                          Humanities
                        </SelectItem>
                        <SelectItem value="core" className="hover:bg-muted/80">
                          Core
                        </SelectItem>
                        <SelectItem
                          value="elective"
                          className="hover:bg-muted/80"
                        >
                          Elective
                        </SelectItem>
                        <SelectItem
                          value="general"
                          className="hover:bg-muted/80"
                        >
                          General
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="language"
                    className="text-sm font-semibold text-foreground"
                  >
                    Teaching Language{" "}
                    <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={formData.language || ""}
                    onValueChange={(value) => updateFormData("language", value)}
                  >
                    <SelectTrigger className="w-full h-11 border-border focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200">
                      <SelectValue placeholder="Select language" />
                    </SelectTrigger>
                    <SelectContent className="bg-background border-border shadow-lg">
                      <SelectItem value="es" className="hover:bg-muted/80">
                        Spanish
                      </SelectItem>
                      <SelectItem value="en" className="hover:bg-muted/80">
                        English
                      </SelectItem>
                      <SelectItem value="both" className="hover:bg-muted/80">
                        English/Spanish
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label
                      htmlFor="nameEs"
                      className="text-sm font-semibold text-foreground"
                    >
                      Name (Spanish) <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="nameEs"
                      value={formData.nameEs}
                      onChange={(e) => updateFormData("nameEs", e.target.value)}
                      placeholder="Enter course name in Spanish"
                      className="h-11 border-border focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
                      disabled={!fieldEnabled.nameEs}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label
                      htmlFor="nameEn"
                      className="text-sm font-semibold text-foreground"
                    >
                      Name (English)
                    </Label>
                    <Input
                      id="nameEn"
                      value={formData.nameEn}
                      onChange={(e) => updateFormData("nameEn", e.target.value)}
                      placeholder="Enter course name in English"
                      className="h-11 border-border focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
                      disabled={!fieldEnabled.nameEn}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label
                      htmlFor="descriptionEs"
                      className="text-sm font-semibold text-foreground"
                    >
                      Description (Spanish){" "}
                      <span className="text-destructive">*</span>
                    </Label>
                    <Textarea
                      id="descriptionEs"
                      value={formData.descriptionEs}
                      onChange={(e) =>
                        updateFormData("descriptionEs", e.target.value)
                      }
                      placeholder="Enter course description in Spanish"
                      className="min-h-[100px] resize-none border-border focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
                      disabled={!fieldEnabled.descriptionEs}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="descriptionEn"
                      className="text-sm font-semibold text-foreground"
                    >
                      Description (English)
                    </Label>
                    <Textarea
                      id="descriptionEn"
                      value={formData.descriptionEn}
                      onChange={(e) =>
                        updateFormData("descriptionEn", e.target.value)
                      }
                      placeholder="Enter course description in English"
                      className="min-h-[100px] resize-none border-border focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
                      disabled={!fieldEnabled.descriptionEn}
                    />
                  </div>
                </div>
              </div>

              {/* Academic Information Section */}
              <div className="space-y-6">
                <div className="flex items-center gap-3 pb-3 border-b border-border/50">
                  <div className="w-2 h-2 rounded-full bg-deep-koamaru"></div>
                  <h3 className="text-lg font-semibold text-foreground">
                    Academic Information
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label
                      htmlFor="credits"
                      className="text-sm font-semibold text-foreground"
                    >
                      Credits <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="credits"
                      type="number"
                      value={formData.credits}
                      onChange={(e) =>
                        updateFormData("credits", parseInt(e.target.value) || 0)
                      }
                      className="h-11 border-border focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
                      min="1"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label
                      htmlFor="level"
                      className="text-sm font-semibold text-foreground"
                    >
                      Course Level
                    </Label>
                    <Select
                      value={formData.level || ""}
                      onValueChange={(value) => updateFormData("level", value)}
                    >
                      <SelectTrigger className="w-full h-11 border-border focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200">
                        <SelectValue placeholder="Select course level" />
                      </SelectTrigger>
                      <SelectContent className="bg-background border-border shadow-lg">
                        <SelectItem
                          value="introductory"
                          className="hover:bg-muted/80"
                        >
                          Introductory
                        </SelectItem>
                        <SelectItem
                          value="intermediate"
                          className="hover:bg-muted/80"
                        >
                          Intermediate
                        </SelectItem>
                        <SelectItem
                          value="advanced"
                          className="hover:bg-muted/80"
                        >
                          Advanced
                        </SelectItem>
                        <SelectItem
                          value="graduate"
                          className="hover:bg-muted/80"
                        >
                          Graduate
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label
                      htmlFor="prerequisites"
                      className="text-sm font-semibold text-foreground"
                    >
                      Prerequisites
                    </Label>
                    <Input
                      id="prerequisites"
                      value={formData.prerequisites}
                      onChange={(e) =>
                        updateFormData("prerequisites", e.target.value)
                      }
                      placeholder="Enter course codes separated by commas"
                      className="h-11 border-border focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label
                      htmlFor="corequisites"
                      className="text-sm font-semibold text-foreground"
                    >
                      Corequisites
                    </Label>
                    <Input
                      id="corequisites"
                      value={formData.corequisites}
                      onChange={(e) =>
                        updateFormData("corequisites", e.target.value)
                      }
                      placeholder="Enter course codes separated by commas"
                      className="h-11 border-border focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label
                      htmlFor="syllabus"
                      className="text-sm font-semibold text-foreground"
                    >
                      Syllabus URL
                    </Label>
                    <Input
                      id="syllabus"
                      value={formData.syllabus}
                      onChange={(e) =>
                        updateFormData("syllabus", e.target.value)
                      }
                      placeholder="https://example.com/syllabus.pdf"
                      className="h-11 border-border focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label
                      htmlFor="isActive"
                      className="text-sm font-semibold text-foreground"
                    >
                      Course Availability{" "}
                      <span className="text-destructive">*</span>
                    </Label>
                    <Select
                      value={formData.isActive.toString() || ""}
                      onValueChange={(value) =>
                        updateFormData("isActive", value === "true")
                      }
                    >
                      <SelectTrigger className="w-full h-11 border-border focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200">
                        <SelectValue placeholder="Select course availability" />
                      </SelectTrigger>
                      <SelectContent className="bg-background border-border shadow-lg">
                        <SelectItem value="true" className="hover:bg-muted/80">
                          <div className="flex items-center gap-2">
                            Available
                          </div>
                        </SelectItem>
                        <SelectItem value="false" className="hover:bg-muted/80">
                          <div className="flex items-center gap-2">
                            Unavailable
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Info Section */}
              <div className="bg-fuzzy-wuzzy/20 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <div className="text-sm space-y-2">
                    <p className="font-medium text-foreground">
                      <span className="text-destructive">*</span> Required
                      fields must be completed
                    </p>
                    <p className="text-foreground">
                      The course code is read-only to maintain data integrity.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-border bg-muted/10 -mx-6 -mb-6 px-6 pb-6 rounded-b-xl">
              <div className="flex gap-3 w-full justify-end">
                {mode === "edit" && (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={handleDelete}
                    disabled={isDeleting || isLoading}
                    className="px-6 py-2.5"
                  >
                    {isDeleting ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Deleting...
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Trash2 className="h-4 w-4" />
                        Delete Course
                      </div>
                    )}
                  </Button>
                )}
                <Button type="submit" variant="default" disabled={isLoading}>
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Saving...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Save className="h-4 w-4" />
                      Save Changes
                    </div>
                  )}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </TabsContent>

        <TabsContent value="details" className="space-y-6 mt-6">
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3 pb-3 border-b border-border/50">
                <div className="w-2 h-2 rounded-full bg-deep-koamaru"></div>
                <h3 className="text-lg font-semibold text-foreground">
                  Associated Sections
                </h3>
              </div>

              {courseWithSections === undefined ? (
                <div className="flex items-center justify-center py-8">
                  <div className="flex flex-col items-center space-y-4">
                    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-muted-foreground text-sm">
                      Loading sections...
                    </p>
                  </div>
                </div>
              ) : !courseWithSections.sections ||
                courseWithSections.sections.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">
                    No sections are currently associated with this course.
                  </p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {courseWithSections.sections.map((sectionData) => (
                    <div
                      key={sectionData.section._id}
                      className="flex items-center justify-between p-4 border border-border rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-3">
                          <span className="font-semibold text-foreground">
                            {sectionData.section.groupNumber}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {sectionData.enrollmentStats.enrolled} /{" "}
                            {sectionData.enrollmentStats.capacity} students
                          </span>
                        </div>
                        <p className="text-sm text-foreground">
                          {sectionData.professor?.firstName}{" "}
                          {sectionData.professor?.lastName}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {sectionData.section.schedule?.sessions.map(
                            (session, idx) => (
                              <div
                                key={idx}
                                className="flex items-center gap-1"
                              >
                                <span className="capitalize">
                                  {session.day}
                                </span>
                                <span>
                                  {session.startTime} - {session.endTime}
                                </span>
                                {idx <
                                  sectionData.section.schedule!.sessions
                                    .length -
                                    1 && <span>•</span>}
                              </div>
                            ),
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                          {sectionData.section.deliveryMethod === "in_person"
                            ? "In Person"
                            : sectionData.section.deliveryMethod ===
                                "online_sync"
                              ? "Online Sync"
                              : sectionData.section.deliveryMethod ===
                                  "online_async"
                                ? "Online Async"
                                : "Hybrid"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </DialogContent>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      {dialogContent}
    </Dialog>
  );
}
