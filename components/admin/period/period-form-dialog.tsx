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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Id } from "@/convex/_generated/dataModel";
import { Period } from "../types";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

// Period form data type for handling form state
export type PeriodFormData = {
  code: string;
  year: number;
  bimester: number;
  nameEs: string;
  nameEn: string;
  startDate: string; // Using string for date inputs
  endDate: string;
  enrollmentStart: string;
  enrollmentEnd: string;
  addDropDeadline: string;
  withdrawalDeadline: string;
  graddingStart: string;
  graddingDeadline: string;
  status: "planning" | "enrollment" | "active" | "grading" | "closed" | undefined;
  isCurrentPeriod: boolean;
};

interface PeriodFormDialogProps {
  mode: "create" | "edit";
  period?: Period;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function PeriodFormDialog({
  mode,
  period,
  trigger,
  open: controlledOpen,
  onOpenChange,
}: PeriodFormDialogProps) {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);

  // Use controlled or internal state
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = onOpenChange || setInternalOpen;

  // Helper function to convert timestamp to date string
  const timestampToDateString = (timestamp: number): string => {
    return new Date(timestamp).toISOString().split('T')[0];
  };

  // Initialize form data based on mode and period
  const initialFormData = React.useMemo((): PeriodFormData => {
    if (mode === "edit" && period) {
      return {
        code: period.code,
        year: period.year,
        bimester: period.bimester,
        nameEs: period.nameEs,
        nameEn: period.nameEn || "",
        startDate: timestampToDateString(period.startDate),
        endDate: timestampToDateString(period.endDate),
        enrollmentStart: timestampToDateString(period.enrollmentStart),
        enrollmentEnd: timestampToDateString(period.enrollmentEnd),
        addDropDeadline: period.addDropDeadline ? timestampToDateString(period.addDropDeadline) : "",
        withdrawalDeadline: period.withdrawalDeadline ? timestampToDateString(period.withdrawalDeadline) : "",
        graddingStart: period.graddingStart ? timestampToDateString(period.graddingStart) : "",
        graddingDeadline: timestampToDateString(period.graddingDeadline),
        status: period.status,
        isCurrentPeriod: period.isCurrentPeriod,
      };
    }
    // For create mode, use empty values for required fields
    return {
      code: "",
      year: new Date().getFullYear(),
      bimester: 1,
      nameEs: "",
      nameEn: "",
      startDate: "",
      endDate: "",
      enrollmentStart: "",
      enrollmentEnd: "",
      addDropDeadline: "",
      withdrawalDeadline: "",
      graddingStart: "",
      graddingDeadline: "",
      status: undefined,
      isCurrentPeriod: false,
    };
  }, [mode, period]);

  const [formData, setFormData] = React.useState(initialFormData);

  const createPeriod = useMutation(api.admin.createPeriod);
  const updatePeriod = useMutation(api.admin.updatePeriod);
  const deletePeriod = useMutation(api.admin.deletePeriod);

  // Reset form when period changes or dialog opens
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
      alert(`Please fix the following errors:\n\n${validationErrors.join('\n')}`);
      return;
    }

    setIsLoading(true);

    // Helper to convert date string to timestamp
    const toTimestamp = (dateString: string) => dateString ? new Date(dateString).getTime() : undefined;

    try {
      if (mode === "create") {
        await createPeriod({
          code: formData.code,
          year: formData.year,
          bimesterNumber: formData.bimester,
          nameEs: formData.nameEs,
          nameEn: formData.nameEn || undefined,
          startDate: toTimestamp(formData.startDate)!,
          endDate: toTimestamp(formData.endDate)!,
          enrollmentStart: toTimestamp(formData.enrollmentStart)!,
          enrollmentEnd: toTimestamp(formData.enrollmentEnd)!,
          addDropDeadline: toTimestamp(formData.addDropDeadline),
          withdrawalDeadline: toTimestamp(formData.withdrawalDeadline),
          gradingStart: toTimestamp(formData.graddingStart),
          gradingDeadline: toTimestamp(formData.graddingDeadline)!,
        });
        alert("Period created successfully!");
      } else {
        if (!period) return;
        await updatePeriod({
          periodId: period._id,
          nameEs: formData.nameEs,
          nameEn: formData.nameEn || undefined,
          startDate: toTimestamp(formData.startDate)!,
          endDate: toTimestamp(formData.endDate)!,
          enrollmentStart: toTimestamp(formData.enrollmentStart)!,
          enrollmentEnd: toTimestamp(formData.enrollmentEnd)!,
          addDropDeadline: toTimestamp(formData.addDropDeadline),
          withdrawalDeadline: toTimestamp(formData.withdrawalDeadline),
          gradingStart: toTimestamp(formData.graddingStart),
          gradingDeadline: toTimestamp(formData.graddingDeadline)!,
          status: formData.status!,
          isCurrentPeriod: formData.isCurrentPeriod,
        });
        alert("Period updated successfully!");
      }

      // Close dialog
      setOpen(false);
    } catch (error) {
      console.error(`Failed to ${mode} period:`, error);
      alert(`Failed to ${mode} period: ${(error as Error).message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!period || mode === "create") return;

    if (!confirm(`Are you sure you want to delete the period "${period.code}"? This action cannot be undone.`)) {
      return;
    }

    setIsDeleting(true);

    try {
      await deletePeriod({ periodId: period._id });
      alert("Period deleted successfully!");
      setOpen(false);
    } catch (error) {
      console.error("Failed to delete period:", error);
      alert(`Failed to delete period: ${(error as Error).message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const updateFormData = (field: string, value: string | boolean | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Helper function to validate required fields
  const validateFormData = (data: PeriodFormData): string[] => {
    const errors: string[] = [];
    
    if (!data.code.trim()) errors.push("Code is required");
    if (!data.nameEs.trim()) errors.push("Spanish name is required");
    if (!data.startDate) errors.push("Start date is required");
    if (!data.endDate) errors.push("End date is required");
    if (!data.enrollmentStart) errors.push("Enrollment start date is required");
    if (!data.enrollmentEnd) errors.push("Enrollment end date is required");
    if (!data.graddingDeadline) errors.push("Grading deadline is required");
    if (!data.status) errors.push("Status is required");
    if (data.year <= 0) errors.push("Year must be a positive number");
    if (data.bimester < 1 || data.bimester > 6) errors.push("Bimester must be between 1 and 6");
    
    // Date validation
    if (data.startDate && data.endDate && new Date(data.startDate) >= new Date(data.endDate)) {
      errors.push("Start date must be before end date");
    }
    if (data.enrollmentStart && data.enrollmentEnd && new Date(data.enrollmentStart) >= new Date(data.enrollmentEnd)) {
      errors.push("Enrollment start must be before enrollment end");
    }
    
    return errors;
  };

  const isCreate = mode === "create";
  const dialogTitle = isCreate ? "Create New Period" : "Edit Period";
  const dialogDescription = isCreate
    ? "Fill in the information below to create a new academic period"
    : "Update the period information below";

  const dialogContent = (
    <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto bg-background border-border shadow-2xl">
      <form onSubmit={handleSubmit} className="space-y-6">
        <DialogHeader className="space-y-4 pb-4 border-b border-border">
          <DialogTitle className="text-2xl font-bold text-center text-foreground flex items-center justify-center gap-3">
            {dialogTitle}
          </DialogTitle>
          <DialogDescription className="text-center text-muted-foreground text-base">
            {dialogDescription}
          </DialogDescription>
        </DialogHeader>

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
                  Code <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => updateFormData("code", e.target.value)}
                  placeholder="Enter period code (e.g., 2025-1)"
                  className="h-11 border-border focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
                  disabled={!isCreate}
                  required
                />
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
                    <SelectItem value="planning" className="hover:bg-muted/80">
                      Planning
                    </SelectItem>
                    <SelectItem value="enrollment" className="hover:bg-muted/80">
                      Enrollment
                    </SelectItem>
                    <SelectItem value="active" className="hover:bg-muted/80">
                      Active
                    </SelectItem>
                    <SelectItem value="grading" className="hover:bg-muted/80">
                      Grading
                    </SelectItem>
                    <SelectItem value="closed" className="hover:bg-muted/80">
                      Closed
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label
                  htmlFor="year"
                  className="text-sm font-semibold text-foreground"
                >
                  Year <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="year"
                  type="number"
                  value={formData.year}
                  onChange={(e) => updateFormData("year", parseInt(e.target.value) || 0)}
                  placeholder="Enter year"
                  className="h-11 border-border focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
                  min="2020"
                  max="2030"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="bimester"
                  className="text-sm font-semibold text-foreground"
                >
                  Bimester <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="bimester"
                  type="number"
                  value={formData.bimester}
                  onChange={(e) => updateFormData("bimester", parseInt(e.target.value) || 0)}
                  placeholder="Enter bimester"
                  className="h-11 border-border focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
                  min="1"
                  max="6"
                  required
                />
              </div>
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
                  placeholder="Enter name in Spanish"
                  className="h-11 border-border focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
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
                  placeholder="Enter name in English"
                  className="h-11 border-border focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="isCurrentPeriod"
                className="text-sm font-semibold text-foreground"
              >
                Current Period <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.isCurrentPeriod.toString()}
                onValueChange={(value) => updateFormData("isCurrentPeriod", value === "true")}
              >
                <SelectTrigger className="w-full h-11 border-border focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background border-border shadow-lg">
                  <SelectItem value="false" className="hover:bg-muted/80">
                    <div className="flex items-center gap-2">
                      No
                    </div>
                  </SelectItem>
                  <SelectItem value="true" className="hover:bg-muted/80">
                    <div className="flex items-center gap-2">
                      Yes - Current Period
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Period Dates Section */}
          <div className="space-y-6">
            <div className="flex items-center gap-3 pb-3 border-b border-border/50">
              <div className="w-2 h-2 rounded-full bg-deep-koamaru"></div>
              <h3 className="text-lg font-semibold text-foreground">
                Period Dates
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label
                  htmlFor="startDate"
                  className="text-sm font-semibold text-foreground"
                >
                  Start Date <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => updateFormData("startDate", e.target.value)}
                  className="h-11 border-border focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="endDate"
                  className="text-sm font-semibold text-foreground"
                >
                  End Date <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => updateFormData("endDate", e.target.value)}
                  className="h-11 border-border focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
                  required
                />
              </div>
            </div>
          </div>

          {/* Enrollment Dates Section */}
          <div className="space-y-6">
            <div className="flex items-center gap-3 pb-3 border-b border-border/50">
              <div className="w-2 h-2 rounded-full bg-deep-koamaru"></div>
              <h3 className="text-lg font-semibold text-foreground">
                Enrollment Dates
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label
                  htmlFor="enrollmentStart"
                  className="text-sm font-semibold text-foreground"
                >
                  Enrollment Start <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="enrollmentStart"
                  type="date"
                  value={formData.enrollmentStart}
                  onChange={(e) => updateFormData("enrollmentStart", e.target.value)}
                  className="h-11 border-border focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="enrollmentEnd"
                  className="text-sm font-semibold text-foreground"
                >
                  Enrollment End <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="enrollmentEnd"
                  type="date"
                  value={formData.enrollmentEnd}
                  onChange={(e) => updateFormData("enrollmentEnd", e.target.value)}
                  className="h-11 border-border focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
                  required
                />
              </div>
            </div>
          </div>

          {/* Important Deadlines Section */}
          <div className="space-y-6">
            <div className="flex items-center gap-3 pb-3 border-b border-border/50">
              <div className="w-2 h-2 rounded-full bg-deep-koamaru"></div>
              <h3 className="text-lg font-semibold text-foreground">
                Important Deadlines
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label
                  htmlFor="addDropDeadline"
                  className="text-sm font-semibold text-foreground"
                >
                  Add/Drop Deadline
                </Label>
                <Input
                  id="addDropDeadline"
                  type="date"
                  value={formData.addDropDeadline}
                  onChange={(e) => updateFormData("addDropDeadline", e.target.value)}
                  className="h-11 border-border focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
                />
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="withdrawalDeadline"
                  className="text-sm font-semibold text-foreground"
                >
                  Withdrawal Deadline
                </Label>
                <Input
                  id="withdrawalDeadline"
                  type="date"
                  value={formData.withdrawalDeadline}
                  onChange={(e) => updateFormData("withdrawalDeadline", e.target.value)}
                  className="h-11 border-border focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label
                  htmlFor="graddingStart"
                  className="text-sm font-semibold text-foreground"
                >
                  Grading Start
                </Label>
                <Input
                  id="graddingStart"
                  type="date"
                  value={formData.graddingStart}
                  onChange={(e) => updateFormData("graddingStart", e.target.value)}
                  className="h-11 border-border focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
                />
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="graddingDeadline"
                  className="text-sm font-semibold text-foreground"
                >
                  Grading Deadline <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="graddingDeadline"
                  type="date"
                  value={formData.graddingDeadline}
                  onChange={(e) => updateFormData("graddingDeadline", e.target.value)}
                  className="h-11 border-border focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
                  required
                />
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
                  {isCreate 
                    ? "Fill in all required information to create a new academic period."
                    : "Update the period information. The code cannot be modified after creation."
                  }
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
                    Delete Period
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
                  {isCreate ? "Create Period" : "Save Changes"}
                </div>
              )}
            </Button>
          </div>
        </DialogFooter>
      </form>
    </DialogContent>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      {dialogContent}
    </Dialog>
  );
}
