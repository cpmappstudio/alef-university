"use client";

import * as React from "react";
import { Save, Trash2 } from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Section } from "../types";

// Section form data type for handling form state
export type SectionFormData = {
  courseId: Id<"courses"> | undefined;
  periodId: Id<"periods"> | undefined;
  groupNumber: string;
  professorId: Id<"users"> | undefined;
  deliveryMethod: "online_sync" | "online_async" | "in_person" | "hybrid";
  status: "draft" | "open" | "closed" | "active" | "grading" | "completed" | undefined;
  timezone: string;
  scheduleNotes: string;
};

interface SectionFormDialogProps {
  mode: "create" | "edit";
  section?: Section;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function SectionFormDialog({
  mode,
  section,
  trigger,
  open: controlledOpen,
  onOpenChange,
}: SectionFormDialogProps) {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState("general");

  // Convex mutations
  const updateSection = useMutation(api.courses.updateSection);
  const createSection = useMutation(api.courses.createSection);
  const deleteSection = useMutation(api.courses.deleteSection);

  // Queries for dropdowns
  const courses = useQuery(api.courses.getAllCourses, { isActive: true });
  const periods = useQuery(api.admin.getAllPeriods, {});
  const professors = useQuery(api.admin.getAllUsers, {
    role: "professor",
    isActive: true
  });

  // Use controlled or internal state
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = onOpenChange || setInternalOpen;

  // Initialize form data based on mode and section
  const initialFormData = React.useMemo((): SectionFormData => {
    if (mode === "edit" && section) {
      return {
        courseId: section.courseId,
        periodId: section.periodId,
        groupNumber: section.groupNumber,
        professorId: section.professorId,
        deliveryMethod: section.deliveryMethod,
        status: section.status,
        timezone: section.schedule?.timezone || "America/Mexico_City",
        scheduleNotes: section.schedule?.notes || "",
      };
    }
    // For create mode, default to online_sync
    return {
      courseId: undefined,
      periodId: undefined,
      groupNumber: "",
      professorId: undefined,
      deliveryMethod: "online_sync",
      status: undefined,
      timezone: "America/Mexico_City",
      scheduleNotes: "",
    };
  }, [mode, section]);

  const [formData, setFormData] = React.useState(initialFormData);

  // Reset form when section changes or dialog opens
  React.useEffect(() => {
    if (open) {
      setFormData(initialFormData);
    }
  }, [open, initialFormData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Enhanced validation with detailed error messages
    const validationErrors = validateFormData(formData);
    if (validationErrors.length > 0) {
      toast.error("Validation Error", {
        description: validationErrors.join(', '),
      });
      return;
    }

    setIsLoading(true);

    try {
      if (mode === "create") {
        // Type assertion is safe here because validation ensures these values exist
        await createSection({
          courseId: formData.courseId!,
          periodId: formData.periodId!,
          groupNumber: formData.groupNumber,
          professorId: formData.professorId!,
          capacity: 9999, // Unlimited capacity (no practical limit)
          deliveryMethod: formData.deliveryMethod,
          schedule: {
            sessions: [], // Empty for now, can be extended later
            timezone: formData.timezone,
            notes: formData.scheduleNotes || undefined,
          },
        });

        toast.success("Section created successfully!", {
          description: `Group ${formData.groupNumber} has been created`,
        });
      } else {
        if (!section) return;

        await updateSection({
          sectionId: section._id,
          capacity: section.capacity, // Keep existing capacity
          deliveryMethod: formData.deliveryMethod,
          status: formData.status!,
          schedule: {
            sessions: section.schedule?.sessions || [], // Preserve existing sessions
            timezone: formData.timezone,
            notes: formData.scheduleNotes || undefined,
          },
        });

        toast.success("Section updated successfully!", {
          description: `Changes to group ${section.groupNumber} have been saved`,
        });
      }

      // Close dialog
      setOpen(false);
    } catch (error) {
      console.error(`Failed to ${mode} section:`, error);
      toast.error(`Failed to ${mode} section`, {
        description: "Please try again or contact support",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!section || mode === "create") return;

    if (!confirm(`Are you sure you want to delete the section "${section.groupNumber}"? This action cannot be undone.`)) {
      return;
    }

    setIsDeleting(true);

    try {
      await deleteSection({
        sectionId: section._id,
        forceDelete: true, // Allow deletion even with enrollments
      });

      toast.success("Section deleted successfully!", {
        description: `Group ${section.groupNumber} has been removed`,
      });
      setOpen(false);
    } catch (error) {
      console.error("Failed to delete section:", error);
      toast.error("Failed to delete section", {
        description: "Please try again or contact support",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const updateFormData = (field: string, value: string | boolean | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Helper function to validate required fields
  const validateFormData = (data: SectionFormData): string[] => {
    const errors: string[] = [];

    if (!data.courseId) errors.push("Course is required");
    if (!data.periodId) errors.push("Period is required");
    if (!data.groupNumber.trim()) errors.push("Group number is required");
    if (!data.professorId) errors.push("Professor is required");
    if (!data.deliveryMethod) errors.push("Delivery method is required");
    if (!data.status && mode === "edit") errors.push("Status is required");

    return errors;
  };

  const isCreate = mode === "create";
  const dialogTitle = isCreate ? "Create New Section" : "Edit Section";
  const dialogDescription = isCreate
    ? "Fill in the information below to create a new section"
    : "Update the section information below";

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
          <TabsTrigger value="general">General Information</TabsTrigger>
          <TabsTrigger value="details" disabled={mode !== "edit"}>Details</TabsTrigger>
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
                      htmlFor="courseId"
                      className="text-sm font-semibold text-foreground"
                    >
                      Course <span className="text-destructive">*</span>
                    </Label>
                    <Select
                      value={formData.courseId || ""}
                      onValueChange={(value) => updateFormData("courseId", value as Id<"courses">)}
                      disabled={!isCreate}
                    >
                      <SelectTrigger className="w-full  border-border focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200">
                        <SelectValue placeholder="Select course" />
                      </SelectTrigger>
                      <SelectContent className="bg-background border-border shadow-lg">
                        {courses?.map((course: any) => (
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

                  <div className="space-y-2">
                    <Label
                      htmlFor="periodId"
                      className="text-sm font-semibold text-foreground"
                    >
                      Period <span className="text-destructive">*</span>
                    </Label>
                    <Select
                      value={formData.periodId || ""}
                      onValueChange={(value) => updateFormData("periodId", value as Id<"periods">)}
                      disabled={!isCreate || !periods || periods.length === 0}
                    >
                      <SelectTrigger className="w-full  border-border focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200">
                        <SelectValue placeholder={!periods || periods.length === 0 ? "No periods available" : "Select period"} />
                      </SelectTrigger>
                      <SelectContent className="bg-background border-border shadow-lg">
                        {periods?.map((period) => (
                          <SelectItem
                            key={period._id}
                            value={period._id}
                            className="hover:bg-muted/80"
                          >
                            {period.code} - {period.nameEs} ({period.year})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label
                      htmlFor="groupNumber"
                      className="text-sm font-semibold text-foreground"
                    >
                      Group Number <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="groupNumber"
                      value={formData.groupNumber}
                      onChange={(e) => updateFormData("groupNumber", e.target.value)}
                      placeholder="Enter group number"
                      className=" border-border focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
                      disabled={!isCreate}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="professorId"
                      className="text-sm font-semibold text-foreground"
                    >
                      Professor <span className="text-destructive">*</span>
                    </Label>
                    <Select
                      value={formData.professorId || ""}
                      onValueChange={(value) => updateFormData("professorId", value as Id<"users">)}
                      disabled={mode === "edit"}
                    >
                      <SelectTrigger className="w-full  border-border focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200">
                        <SelectValue placeholder={!professors || professors.length === 0 ? "No professors available" : "Select professor"} />
                      </SelectTrigger>
                      <SelectContent className="bg-background border-border shadow-lg">
                        {professors?.map((professor) => (
                          <SelectItem
                            key={professor._id}
                            value={professor._id}
                            className="hover:bg-muted/80"
                          >
                            {professor.firstName} {professor.lastName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Section Configuration */}
              <div className="space-y-6">
                <div className="flex items-center gap-3 pb-3 border-b border-border/50">
                  <div className="w-2 h-2 rounded-full bg-deep-koamaru"></div>
                  <h3 className="text-lg font-semibold text-foreground">
                    Section Configuration
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label
                      htmlFor="deliveryMethod"
                      className="text-sm font-semibold text-foreground"
                    >
                      Delivery Method <span className="text-destructive">*</span>
                    </Label>
                    <Select
                      value={formData.deliveryMethod}
                      onValueChange={(value) => updateFormData("deliveryMethod", value)}
                    >
                      <SelectTrigger className="w-full border-border focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200">
                        <SelectValue placeholder="Select delivery method" />
                      </SelectTrigger>
                      <SelectContent className="bg-background border-border shadow-lg">
                        <SelectItem value="online_sync" className="hover:bg-muted/80">
                          Online Sync
                        </SelectItem>
                        <SelectItem value="online_async" className="hover:bg-muted/80">
                          Online Async
                        </SelectItem>
                        <SelectItem value="in_person" className="hover:bg-muted/80">
                          In Person
                        </SelectItem>
                        <SelectItem value="hybrid" className="hover:bg-muted/80">
                          Hybrid
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {mode === "edit" && (
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
                        <SelectTrigger className="w-full border-border focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent className="bg-background border-border shadow-lg">
                          <SelectItem value="draft" className="hover:bg-muted/80">
                            Draft
                          </SelectItem>
                          <SelectItem value="open" className="hover:bg-muted/80">
                            Open
                          </SelectItem>
                          <SelectItem value="closed" className="hover:bg-muted/80">
                            Closed
                          </SelectItem>
                          <SelectItem value="active" className="hover:bg-muted/80">
                            Active
                          </SelectItem>
                          <SelectItem value="grading" className="hover:bg-muted/80">
                            Grading
                          </SelectItem>
                          <SelectItem value="completed" className="hover:bg-muted/80">
                            Completed
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label
                      htmlFor="timezone"
                      className="text-sm font-semibold text-foreground"
                    >
                      Timezone <span className="text-destructive">*</span>
                    </Label>
                    <Select
                      value={formData.timezone}
                      onValueChange={(value) => updateFormData("timezone", value)}
                    >
                      <SelectTrigger className="w-full border-border focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200">
                        <SelectValue placeholder="Select timezone" />
                      </SelectTrigger>
                      <SelectContent className="bg-background border-border shadow-lg">
                        <SelectGroup>
                          <SelectLabel>North America</SelectLabel>
                          <SelectItem value="America/Mexico_City" className="hover:bg-muted/80">
                            Mexico City (GMT-6)
                          </SelectItem>
                          <SelectItem value="America/Cancun" className="hover:bg-muted/80">
                            Cancún (GMT-5)
                          </SelectItem>
                          <SelectItem value="America/New_York" className="hover:bg-muted/80">
                            New York (GMT-5)
                          </SelectItem>
                          <SelectItem value="America/Chicago" className="hover:bg-muted/80">
                            Chicago (GMT-6)
                          </SelectItem>
                          <SelectItem value="America/Denver" className="hover:bg-muted/80">
                            Denver (GMT-7)
                          </SelectItem>
                          <SelectItem value="America/Los_Angeles" className="hover:bg-muted/80">
                            Los Angeles (GMT-8)
                          </SelectItem>
                        </SelectGroup>
                        <SelectGroup>
                          <SelectLabel>South America</SelectLabel>
                          <SelectItem value="America/Sao_Paulo" className="hover:bg-muted/80">
                            Belo Horizonte / São Paulo (GMT-3)
                          </SelectItem>
                          <SelectItem value="America/Argentina/Buenos_Aires" className="hover:bg-muted/80">
                            Osorno / Buenos Aires (GMT-3)
                          </SelectItem>
                        </SelectGroup>
                        <SelectGroup>
                          <SelectLabel>Africa</SelectLabel>
                          <SelectItem value="Africa/Nairobi" className="hover:bg-muted/80">
                            Nairobi (GMT+3)
                          </SelectItem>
                        </SelectGroup>
                        <SelectGroup>
                          <SelectLabel>Europe</SelectLabel>
                          <SelectItem value="Europe/Madrid" className="hover:bg-muted/80">
                            Madrid (GMT+1)
                          </SelectItem>
                          <SelectItem value="Europe/London" className="hover:bg-muted/80">
                            London (GMT+0)
                          </SelectItem>
                        </SelectGroup>
                        <SelectGroup>
                          <SelectLabel>Asia/Pacific</SelectLabel>
                          <SelectItem value="Australia/Sydney" className="hover:bg-muted/80">
                            Sydney (GMT+11)
                          </SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="scheduleNotes"
                      className="text-sm font-semibold text-foreground"
                    >
                      Schedule Notes
                    </Label>
                    <Textarea
                      id="scheduleNotes"
                      value={formData.scheduleNotes}
                      onChange={(e) => updateFormData("scheduleNotes", e.target.value)}
                      placeholder="Enter schedule details, meeting times, or any other relevant information..."
                      className="border-border focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200 min-h-[100px]"
                    />
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
                        Delete Section
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
                      {isCreate ? "Create Section" : "Save Changes"}
                    </div>
                  )}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </TabsContent>

        <TabsContent value="details" className="space-y-6 mt-6">
          <div className="space-y-6">
            {/* Only show details if we're in edit mode and have a section */}
            {mode === "edit" && section && (
              <>
                <div className="space-y-4">
                  <div className="flex items-center gap-3 pb-3 border-b border-border/50">
                    <div className="w-2 h-2 rounded-full bg-deep-koamaru"></div>
                    <h3 className="text-lg font-semibold text-foreground">
                      Period Information
                    </h3>
                  </div>

                  <div className="space-y-3">
                    {periods ? (
                      periods.filter(period => period._id === section.periodId).map((period) => (
                        <div
                          key={period._id}
                          className="flex items-center justify-between p-4 border border-border rounded-lg bg-muted/30"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-3">
                              <span className="font-semibold text-foreground">
                                {period.code} - {period.nameEs}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {new Date(period.startDate).toLocaleDateString()} to {new Date(period.endDate).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="text-right">
                            <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                              {period.status}
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-4">
                        <p className="text-muted-foreground">Loading period information...</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-3 pb-3 border-b border-border/50">
                    <div className="w-2 h-2 rounded-full bg-deep-koamaru"></div>
                    <h3 className="text-lg font-semibold text-foreground">
                      Professor Information
                    </h3>
                  </div>

                  <div className="space-y-3">
                    {professors ? (
                      professors.filter(professor => professor._id === section.professorId).map((professor) => (
                        <div
                          key={professor._id}
                          className="flex items-center justify-between p-4 border border-border rounded-lg bg-muted/30"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-3">
                              <span className="font-semibold text-foreground">
                                {professor.firstName} {professor.lastName}
                              </span>
                            </div>
                            {professor.professorProfile && (
                              <p className="text-sm text-muted-foreground">
                                {professor.professorProfile.title} - {professor.professorProfile.department}
                              </p>
                            )}
                            <p className="text-sm text-muted-foreground">{professor.email}</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-4">
                        <p className="text-muted-foreground">Loading professor information...</p>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
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
