"use client";

import * as React from "react";
import { Save, Trash2, Info } from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { useUser } from "@clerk/nextjs";
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
import { Program, ProgramFormData } from "../types";
import { Textarea } from "@/components/ui/textarea";
import type { UserRole } from "@/convex/types";

interface ProgramFormDialogProps {
  mode: "create" | "edit";
  program?: Program;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function ProgramFormDialog({
  mode,
  program,
  trigger,
  open: controlledOpen,
  onOpenChange,
}: ProgramFormDialogProps) {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState("general");

  // Get user role from Clerk
  const { user } = useUser();
  const userRole = user?.publicMetadata?.role as UserRole | undefined;
  const isSuperAdmin = userRole === "superadmin";

  // Convex mutations
  const updateProgram = useMutation(api.programs.updateProgram);
  const createProgram = useMutation(api.programs.createProgram);
  const deleteProgram = useMutation(api.programs.deleteProgram);

  const associatedCourses = useQuery(
    api.courses.getAllCourses,
    mode === "edit" && program ? { programId: program._id } : "skip",
  );

  // Use controlled or internal state
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = onOpenChange || setInternalOpen;

  // Initialize form data based on mode and program
  const initialFormData = React.useMemo((): ProgramFormData => {
    if (mode === "edit" && program) {
      return {
        code: program.code || "",
        codeEn: program.codeEn || "",
        nameEs: program.nameEs || "",
        nameEn: program.nameEn || "",
        descriptionEs: program.descriptionEs || "",
        descriptionEn: program.descriptionEn || "",
        type: program.type,
        degree: program.degree || "",
        language: program.language,
        totalCredits: program.totalCredits,
        durationBimesters: program.durationBimesters,
        tuitionPerCredit: program.tuitionPerCredit || 0,
        isActive: program.isActive,
      };
    }
    // For create mode, use undefined for required selects to show placeholders
    return {
      code: "",
      codeEn: "",
      nameEs: "",
      nameEn: "",
      descriptionEs: "",
      descriptionEn: "",
      type: undefined, // This allows placeholder to show
      degree: "",
      language: undefined, // This allows placeholder to show
      totalCredits: 0,
      durationBimesters: 0,
      tuitionPerCredit: 0,
      isActive: undefined as any, // This allows placeholder to show
    };
  }, [mode, program]);

  const [formData, setFormData] = React.useState(initialFormData);

  // Reset form when program changes or dialog opens
  React.useEffect(() => {
    if (open) {
      setFormData(initialFormData);
      setActiveTab("general"); // Reset to general tab when opening
    }
  }, [open, initialFormData]);

  // No avatar functionality needed for programs

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationErrors = validateFormData(formData);
    if (validationErrors.length > 0) {
      alert(
        `Please fix the following errors:\n\n${validationErrors.join("\n")}`,
      );
      return;
    }
    setIsLoading(true);

    try {
      if (mode === "create") {
        await createProgram({
          codeEs: formData.codeEs || undefined,
          codeEn: formData.codeEn || undefined,
          nameEs: formData.nameEs || undefined,
          nameEn: formData.nameEn || undefined,
          descriptionEs: formData.descriptionEs || undefined,
          descriptionEn: formData.descriptionEn || undefined,
          type: formData.type!, // Validation ensures this is not undefined
          degree: formData.degree || undefined,
          language: formData.language!, // Validation ensures this is not undefined
          totalCredits: formData.totalCredits,
          durationBimesters: formData.durationBimesters,
          tuitionPerCredit:
            formData.tuitionPerCredit > 0
              ? formData.tuitionPerCredit
              : undefined,
        });
        alert("Program created successfully!");
      } else {
        if (!program) return;
        await updateProgram({
          programId: program._id,
          codeEs: formData.codeEs || undefined,
          codeEn: formData.codeEn || undefined,
          nameEs: formData.nameEs || undefined,
          nameEn: formData.nameEn || undefined,
          descriptionEs: formData.descriptionEs || undefined,
          descriptionEn: formData.descriptionEn || undefined,
          degree: formData.degree || undefined,
          language: formData.language!,
          tuitionPerCredit:
            formData.tuitionPerCredit > 0
              ? formData.tuitionPerCredit
              : undefined,
          isActive: formData.isActive!,
        });
        alert("Program updated successfully!");
      }
      setOpen(false);
    } catch (error) {
      console.error(`Failed to ${mode} program:`, error);
      alert(`Failed to ${mode} program. Please try again.`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!program || mode === "create") return;
    const programName = program.nameEs || program.nameEn || program.code;
    if (
      !confirm(
        `Are you sure you want to delete the program "${programName}"? This action cannot be undone and is only possible if no students are enrolled.`,
      )
    ) {
      return;
    }
    setIsDeleting(true);
    try {
      await deleteProgram({ programId: program._id });
      alert("Program deleted successfully!");
      setOpen(false);
    } catch (error) {
      console.error("Failed to delete program:", error);
      alert(`Failed to delete program: ${(error as Error).message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const updateFormData = (field: string, value: string | boolean | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Helper function to validate required fields based on language selection
  const validateFormData = (data: ProgramFormData): string[] => {
    const errors: string[] = [];

    // Always required fields
    if (!data.type) errors.push("Program type is required");
    if (!data.language) errors.push("Teaching language is required");
    if (data.isActive === undefined)
      errors.push("Program availability is required");
    if (data.totalCredits <= 0)
      errors.push("Total credits must be greater than 0");
    if (data.durationBimesters <= 0)
      errors.push("Duration must be greater than 0");

    // Validate Spanish fields when language is "es" or "both"
    if (data.language === "es" || data.language === "both") {
      if (!data.code.trim())
        errors.push(
          "Spanish program code is required when language is Spanish or both",
        );
      if (!data.nameEs.trim())
        errors.push(
          "Spanish name is required when language is Spanish or both",
        );
      if (!data.descriptionEs.trim())
        errors.push(
          "Spanish description is required when language is Spanish or both",
        );
    }

    // Validate English fields when language is "en" or "both"
    if (data.language === "en" || data.language === "both") {
      if (!data.codeEn.trim())
        errors.push(
          "English program code is required when language is English or both",
        );
      if (!data.nameEn.trim())
        errors.push(
          "English name is required when language is English or both",
        );
      if (!data.descriptionEn.trim())
        errors.push(
          "English description is required when language is English or both",
        );
    }

    return errors;
  };

  // Language field enablement logic
  const getFieldEnabledState = () => {
    const language = formData.language;
    // All fields are now editable in both create and edit mode
    // Only language selection determines which fields are shown and enabled
    return {
      code: language === "es" || language === "both", // code for Spanish programs
      codeEn: language === "en" || language === "both", // codeEn for English programs
      nameEs: language === "es" || language === "both",
      nameEn: language === "en" || language === "both",
      descriptionEs: language === "es" || language === "both",
      descriptionEn: language === "en" || language === "both",
    };
  };

  const fieldEnabled = getFieldEnabledState();

  const isCreate = mode === "create";
  const dialogTitle = isCreate ? "Create New Program" : "Edit Program";
  const dialogDescription = isCreate
    ? "Fill in the information below to create a new program"
    : "Update the program information below";

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
          <TabsTrigger value="details" disabled={mode === "create"}>
            Details
          </TabsTrigger>
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
                    onValueChange={(value) =>
                      updateFormData("language", value as Program["language"])
                    }
                  >
                    <SelectTrigger className="w-full border-border focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200">
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

                {/* Instruction message when no language is selected */}
                {!formData.language && isCreate && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border border-border/50">
                    <Info className="text-deep-koamaru" />
                    <p className="text-sm text-muted-foreground">
                      Please select a teaching language to configure the program
                      details (code, name, and description).
                    </p>
                  </div>
                )}

                <div
                  className={`grid gap-6 ${formData.language === "both" ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1"}`}
                >
                  {/* CodeEn field for English (en or both) */}
                  {(formData.language === "en" ||
                    formData.language === "both") && (
                    <div className="space-y-2">
                      <Label
                        htmlFor="codeEn"
                        className="text-sm font-semibold text-foreground"
                      >
                        Program Code (English)
                        <span className="text-destructive"> *</span>
                      </Label>
                      <Input
                        id="codeEn"
                        value={formData.codeEn}
                        onChange={(e) =>
                          updateFormData("codeEn", e.target.value)
                        }
                        placeholder="Enter program code in English"
                        className="border-border focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
                        disabled={!fieldEnabled.codeEn}
                        required
                      />
                    </div>
                  )}
                  {/* Code field for Spanish (es or both) */}
                  {(formData.language === "es" ||
                    formData.language === "both") && (
                    <div className="space-y-2">
                      <Label
                        htmlFor="code"
                        className="text-sm font-semibold text-foreground"
                      >
                        Program Code (Spanish)
                        <span className="text-destructive"> *</span>
                      </Label>
                      <Input
                        id="code"
                        value={formData.code}
                        onChange={(e) => updateFormData("code", e.target.value)}
                        placeholder="Enter program code in Spanish"
                        className="border-border focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
                        disabled={!fieldEnabled.code}
                        required
                      />
                    </div>
                  )}
                </div>

                <div
                  className={`grid gap-6 ${formData.language === "both" ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1"}`}
                >
                  {/* Name field for English (en or both) */}
                  {(formData.language === "en" ||
                    formData.language === "both") && (
                    <div className="space-y-2">
                      <Label
                        htmlFor="nameEn"
                        className="text-sm font-semibold text-foreground"
                      >
                        Name (English)
                        <span className="text-destructive"> *</span>
                      </Label>
                      <Input
                        id="nameEn"
                        value={formData.nameEn}
                        onChange={(e) =>
                          updateFormData("nameEn", e.target.value)
                        }
                        placeholder="Enter program name in English"
                        className="border-border focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
                        disabled={!fieldEnabled.nameEn}
                        required
                      />
                    </div>
                  )}
                  {/* Name field for Spanish (es or both) */}
                  {(formData.language === "es" ||
                    formData.language === "both") && (
                    <div className="space-y-2">
                      <Label
                        htmlFor="nameEs"
                        className="text-sm font-semibold text-foreground"
                      >
                        Name (Spanish)
                        <span className="text-destructive"> *</span>
                      </Label>
                      <Input
                        id="nameEs"
                        value={formData.nameEs}
                        onChange={(e) =>
                          updateFormData("nameEs", e.target.value)
                        }
                        placeholder="Enter program name in Spanish"
                        className="border-border focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
                        disabled={!fieldEnabled.nameEs}
                        required
                      />
                    </div>
                  )}
                </div>

                <div
                  className={`grid gap-6 ${formData.language === "both" ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1"}`}
                >
                  {/* Description field for English (en or both) */}
                  {(formData.language === "en" ||
                    formData.language === "both") && (
                    <div className="space-y-2">
                      <Label
                        htmlFor="descriptionEn"
                        className="text-sm font-semibold text-foreground"
                      >
                        Description (English)
                        <span className="text-destructive"> *</span>
                      </Label>
                      <Textarea
                        id="descriptionEn"
                        value={formData.descriptionEn}
                        onChange={(e) =>
                          updateFormData("descriptionEn", e.target.value)
                        }
                        placeholder="Enter program description in English"
                        className="min-h-[100px] resize-none border-border focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
                        disabled={!fieldEnabled.descriptionEn}
                        required
                      />
                    </div>
                  )}
                  {/* Description field for Spanish (es or both) */}
                  {(formData.language === "es" ||
                    formData.language === "both") && (
                    <div className="space-y-2">
                      <Label
                        htmlFor="descriptionEs"
                        className="text-sm font-semibold text-foreground"
                      >
                        Description (Spanish)
                        <span className="text-destructive"> *</span>
                      </Label>
                      <Textarea
                        id="descriptionEs"
                        value={formData.descriptionEs}
                        onChange={(e) =>
                          updateFormData("descriptionEs", e.target.value)
                        }
                        placeholder="Enter program description in Spanish"
                        className="min-h-[100px] resize-none border-border focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
                        disabled={!fieldEnabled.descriptionEs}
                        required
                      />
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="type"
                    className="text-sm font-semibold text-foreground"
                  >
                    Program Type <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={formData.type || ""}
                    onValueChange={(value) =>
                      updateFormData("type", value as Program["type"])
                    }
                  >
                    <SelectTrigger className="w-full border-border focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent className="bg-background border-border shadow-lg">
                      <SelectItem value="diploma" className="hover:bg-muted/80">
                        Diploma
                      </SelectItem>
                      <SelectItem
                        value="bachelor"
                        className="hover:bg-muted/80"
                      >
                        Bachelor
                      </SelectItem>
                      <SelectItem value="master" className="hover:bg-muted/80">
                        Master
                      </SelectItem>
                      <SelectItem
                        value="doctorate"
                        className="hover:bg-muted/80"
                      >
                        Doctorate
                      </SelectItem>
                    </SelectContent>
                  </Select>
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
                      htmlFor="totalCredits"
                      className="text-sm font-semibold text-foreground"
                    >
                      Total Credits <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="totalCredits"
                      type="number"
                      value={
                        formData.totalCredits === 0 ? "" : formData.totalCredits
                      }
                      onChange={(e) => {
                        const value =
                          e.target.value === "" ? 0 : parseInt(e.target.value);
                        updateFormData(
                          "totalCredits",
                          isNaN(value) ? 0 : value,
                        );
                      }}
                      className="border-border focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
                      min="1"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label
                      htmlFor="durationBimesters"
                      className="text-sm font-semibold text-foreground"
                    >
                      Duration (Bimesters){" "}
                      <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="durationBimesters"
                      type="number"
                      value={
                        formData.durationBimesters === 0
                          ? ""
                          : formData.durationBimesters
                      }
                      onChange={(e) => {
                        const value =
                          e.target.value === "" ? 0 : parseInt(e.target.value);
                        updateFormData(
                          "durationBimesters",
                          isNaN(value) ? 0 : value,
                        );
                      }}
                      className="border-border focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
                      min="1"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="isActive"
                    className="text-sm font-semibold text-foreground"
                  >
                    Program Availability{" "}
                    <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={
                      formData.isActive !== undefined
                        ? formData.isActive.toString()
                        : ""
                    }
                    onValueChange={(value) =>
                      updateFormData("isActive", value === "true")
                    }
                  >
                    <SelectTrigger className="w-full border-border focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200">
                      <SelectValue placeholder="Select program availability" />
                    </SelectTrigger>
                    <SelectContent className="bg-background border-border shadow-lg">
                      <SelectItem value="true" className="hover:bg-muted/80">
                        <div className="flex items-center gap-2">Available</div>
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

              {/* Info Section */}
              <div className="bg-fuzzy-wuzzy/20 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <div className="text-sm space-y-2">
                    <p className="font-medium text-foreground">
                      <span className="text-destructive">*</span> Required
                      fields must be completed
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-border bg-muted/10 -mx-6 -mb-6 px-6 pb-6 rounded-b-xl">
              <div className="flex gap-3 w-full justify-between">
                <div className="flex gap-3 ml-auto">
                  {!isCreate && isSuperAdmin && (
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
                          Deleting...
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Trash2 className="h-4 w-4" />
                          Delete Program
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
                        {isCreate ? "Creating..." : "Saving..."}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Save className="h-4 w-4" />
                        {isCreate ? "Create Program" : "Save Changes"}
                      </div>
                    )}
                  </Button>
                </div>
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
                  Associated Courses
                </h3>
              </div>

              {associatedCourses === undefined ? (
                <div className="flex items-center justify-center py-8">
                  <div className="flex flex-col items-center space-y-4">
                    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-muted-foreground text-sm">
                      Loading courses...
                    </p>
                  </div>
                </div>
              ) : associatedCourses.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">
                    No courses are currently associated with this program.
                  </p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {associatedCourses.map((course) => (
                    <div
                      key={course._id}
                      className="flex items-center justify-between p-4 border border-border rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-3">
                          <span className="font-semibold text-foreground">
                            {course.codeEs}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {course.credits} credits
                          </span>
                        </div>
                        <p className="text-sm text-foreground">
                          {course.nameEs}
                        </p>
                        {course.nameEn && (
                          <p className="text-xs text-muted-foreground">
                            {course.nameEn}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                          {course.category}
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
