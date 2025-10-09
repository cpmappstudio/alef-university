"use client";

import * as React from "react";
import { Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Student } from "../types";
import { useMutation, useQuery, useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";

interface StudentFormData {
  firstName: string;
  lastName: string;
  email: string;
  dateOfBirth: string;
  nationality: string;
  documentType: "passport" | "national_id" | "driver_license" | "other" | undefined;
  documentNumber: string;
  phone: string;
  country: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  isActive: boolean;
  studentProfile: {
    studentCode: string;
    programId: string;
    enrollmentDate: string;
    expectedGraduationDate: string;
    status: "active" | "inactive" | "on_leave" | "graduated" | "withdrawn" | undefined;
    academicStanding: "good_standing" | "probation" | "suspension" | undefined;
  };
}

interface StudentFormDialogProps {
  mode: "create" | "edit";
  student?: Student;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function StudentFormDialog({
  mode,
  student,
  trigger,
  open: controlledOpen,
  onOpenChange,
}: StudentFormDialogProps) {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState("general");

  const adminCreateStudent = useAction(api.admin.createUserWithClerk);
  const adminUpdateStudent = useMutation(api.admin.adminUpdateStudent);
  const deactivateUser = useMutation(api.auth.deactivateUser);

  // Fetch programs for the dropdown
  const programs = useQuery(api.programs.getAllPrograms, { isActive: true });

  // Fetch student's enrollment history for the "Details" tab
  const enrollmentHistory = useQuery(
    api.admin.getAdminEnrollments,
    mode === 'edit' && student ? { studentId: student._id } : 'skip'
  );

  // Use controlled or internal state
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = onOpenChange || setInternalOpen;

  // Initialize form data based on mode and student
  const initialFormData = React.useMemo((): StudentFormData => {
    if (mode === "edit" && student) {
      return {
        firstName: student.firstName,
        lastName: student.lastName,
        email: student.email,
        dateOfBirth: student.dateOfBirth ? new Date(student.dateOfBirth).toISOString().split('T')[0] : "",
        nationality: student.nationality || "",
        documentType: student.documentType,
        documentNumber: student.documentNumber || "",
        phone: student.phone || "",
        country: student.country || "",
        address: {
          street: student.address?.street || "",
          city: student.address?.city || "",
          state: student.address?.state || "",
          zipCode: student.address?.zipCode || "",
          country: student.address?.country || "",
        },
        isActive: student.isActive,
        studentProfile: {
          studentCode: student.studentProfile?.studentCode || "",
          programId: (student.studentProfile?.programId as string) || "",
          enrollmentDate: student.studentProfile?.enrollmentDate
            ? new Date(student.studentProfile.enrollmentDate).toISOString().split('T')[0]
            : "",
          expectedGraduationDate: student.studentProfile?.expectedGraduationDate
            ? new Date(student.studentProfile.expectedGraduationDate).toISOString().split('T')[0]
            : "",
          status: student.studentProfile?.status,
          academicStanding: student.studentProfile?.academicStanding,
        },
      };
    }
    // For create mode
    return {
      firstName: "",
      lastName: "",
      email: "",
      dateOfBirth: "",
      nationality: "",
      documentType: undefined,
      documentNumber: "",
      phone: "",
      country: "",
      address: {
        street: "",
        city: "",
        state: "",
        zipCode: "",
        country: "",
      },
      isActive: true,
      studentProfile: {
        studentCode: "",
        programId: "",
        enrollmentDate: "",
        expectedGraduationDate: "",
        status: undefined,
        academicStanding: undefined,
      },
    };
  }, [mode, student]);

  const [formData, setFormData] = React.useState(initialFormData);

  // Reset form when student changes or dialog opens
  React.useEffect(() => {
    if (open) {
      setFormData(initialFormData);
      setActiveTab("general");
    }
  }, [open, initialFormData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Basic validation
    const validationErrors = validateFormData(formData);
    if (validationErrors.length > 0) {
      toast.error("Validation Error", {
        description: validationErrors.join(', '),
      });
      return;
    }

    setIsLoading(true);

    try {
      // Convert string dates to timestamps
      const enrollmentDate = formData.studentProfile.enrollmentDate
        ? new Date(formData.studentProfile.enrollmentDate).getTime()
        : undefined;

      const expectedGraduationDate = formData.studentProfile.expectedGraduationDate
        ? new Date(formData.studentProfile.expectedGraduationDate).getTime()
        : undefined;

      const dateOfBirth = formData.dateOfBirth
        ? new Date(formData.dateOfBirth).getTime()
        : undefined;

      if (mode === "create") {
        await adminCreateStudent({
          email: formData.email,
          firstName: formData.firstName,
          lastName: formData.lastName,
          role: 'student',
          dateOfBirth,
          nationality: formData.nationality || undefined,
          documentType: formData.documentType,
          documentNumber: formData.documentNumber || undefined,
          phone: formData.phone || undefined,
          country: formData.country || undefined,
          address: formData.address.street ? {
            street: formData.address.street,
            city: formData.address.city,
            state: formData.address.state,
            zipCode: formData.address.zipCode,
            country: formData.address.country,
          } : undefined,
          studentProfile: {
            studentCode: formData.studentProfile.studentCode,
            programId: formData.studentProfile.programId as Id<"programs">,
            enrollmentDate: formData.studentProfile.enrollmentDate
              ? new Date(formData.studentProfile.enrollmentDate).getTime()
              : Date.now(),
            status: formData.studentProfile.status!,
          }
        });
        toast.success("Student created successfully!", {
          description: `${formData.firstName} ${formData.lastName} has been added`,
        });
      } else {
        if (!student) return;
        await adminUpdateStudent({
          studentId: student._id,
          firstName: formData.firstName,
          lastName: formData.lastName,
          dateOfBirth,
          nationality: formData.nationality || undefined,
          documentType: formData.documentType,
          documentNumber: formData.documentNumber || undefined,
          phone: formData.phone || undefined,
          country: formData.country || undefined,
          address: formData.address.street ? {
            street: formData.address.street,
            city: formData.address.city,
            state: formData.address.state,
            zipCode: formData.address.zipCode,
            country: formData.address.country,
          } : undefined,
          isActive: formData.isActive,
          programId: formData.studentProfile.programId as Id<"programs">,
          enrollmentDate: enrollmentDate ?? (student?.studentProfile?.enrollmentDate || Date.now()),
          expectedGraduationDate,
          status: formData.studentProfile.status!,
          academicStanding: formData.studentProfile.academicStanding || "good_standing",
        });
        toast.success("Student updated successfully!", {
          description: `Changes to ${formData.firstName} ${formData.lastName} have been saved`,
        });
      }

      setOpen(false);
    } catch (error) {
      console.error(`Failed to ${mode} student:`, error);
      toast.error(`Failed to ${mode} student`, {
        description: (error as Error).message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!student || mode === "create") return;

    if (!confirm(`Are you sure you want to deactivate the student "${student.firstName} ${student.lastName}"? This action cannot be undone.`)) {
      return;
    }

    setIsDeleting(true);

    try {
      await deactivateUser({ userId: student._id });
      toast.success("Student deactivated successfully!", {
        description: `${student.firstName} ${student.lastName} has been deactivated`,
      });
      setOpen(false);
    } catch (error) {
      console.error("Failed to deactivate student:", error);
      toast.error("Failed to deactivate student", {
        description: (error as Error).message,
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const updateFormData = (field: string, value: string | boolean | number) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setFormData((prev) => ({
        ...prev,
        [parent]: {
          ...((prev as any)[parent] as object),
          [child]: value,
        },
      }));
    } else {
      setFormData((prev) => ({ ...prev, [field]: value }));
    }
  };

  // Helper function to validate required fields
  const validateFormData = (data: StudentFormData): string[] => {
    const errors: string[] = [];

    if (!data.firstName.trim()) errors.push("First name is required");
    if (!data.lastName.trim()) errors.push("Last name is required");
    if (!data.email.trim()) errors.push("Email is required");
    if (!data.studentProfile.studentCode.trim()) errors.push("Student code is required");
    if (!data.studentProfile.programId) errors.push("Program is required");
    if (!data.studentProfile.enrollmentDate) errors.push("Enrollment date is required");
    if (!data.studentProfile.status) errors.push("Status is required");
    if (!data.studentProfile.enrollmentDate) errors.push("Enrollment date is required");

    return errors;
  };

  const isCreate = mode === "create";
  const dialogTitle = isCreate ? "Create New Student" : "Edit Student";
  const dialogDescription = isCreate
    ? "Fill in the information below to create a new student"
    : "Update the student information below";

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
          <TabsTrigger value="general">Información general</TabsTrigger>
          <TabsTrigger value="details" disabled={mode === "create"}>
            Detalles
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6 mt-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-8 py-2">
              {/* Personal Information Section */}
              <div className="space-y-6">
                <div className="flex items-center gap-3 pb-3 border-b border-border/50">
                  <div className="w-2 h-2 rounded-full bg-deep-koamaru"></div>
                  <h3 className="text-lg font-semibold text-foreground">
                    Personal Information
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="firstName" className="text-sm font-semibold text-foreground">
                      First Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="firstName"
                      value={formData.firstName}
                      onChange={(e) => updateFormData("firstName", e.target.value)}
                      placeholder="Enter first name"
                      className="h-11 border-border focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="lastName" className="text-sm font-semibold text-foreground">
                      Last Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="lastName"
                      value={formData.lastName}
                      onChange={(e) => updateFormData("lastName", e.target.value)}
                      placeholder="Enter last name"
                      className="h-11 border-border focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-semibold text-foreground">
                      Email <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => updateFormData("email", e.target.value)}
                      placeholder="Enter email address"
                      className="h-11 border-border focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="dateOfBirth" className="text-sm font-semibold text-foreground">
                      Date of Birth
                    </Label>
                    <Input
                      id="dateOfBirth"
                      type="date"
                      value={formData.dateOfBirth}
                      onChange={(e) => updateFormData("dateOfBirth", e.target.value)}
                      className="h-11 border-border focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="nationality" className="text-sm font-semibold text-foreground">
                      Nationality
                    </Label>
                    <Input
                      id="nationality"
                      value={formData.nationality}
                      onChange={(e) => updateFormData("nationality", e.target.value)}
                      placeholder="Enter nationality"
                      className="h-11 border-border focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="documentType" className="text-sm font-semibold text-foreground">
                      Document Type
                    </Label>
                    <Select
                      value={formData.documentType || ""}
                      onValueChange={(value) => updateFormData("documentType", value)}
                    >
                      <SelectTrigger className="w-full h-11 border-border focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200">
                        <SelectValue placeholder="Select document type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="national_id">National ID</SelectItem>
                        <SelectItem value="passport">Passport</SelectItem>
                        <SelectItem value="driver_license">Driver License</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="documentNumber" className="text-sm font-semibold text-foreground">
                      Document Number
                    </Label>
                    <Input
                      id="documentNumber"
                      value={formData.documentNumber}
                      onChange={(e) => updateFormData("documentNumber", e.target.value)}
                      placeholder="Enter document number"
                      className="h-11 border-border focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-sm font-semibold text-foreground">
                      Phone
                    </Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => updateFormData("phone", e.target.value)}
                      placeholder="Enter phone number"
                      className="h-11 border-border focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="country" className="text-sm font-semibold text-foreground">
                      Country
                    </Label>
                    <Input
                      id="country"
                      value={formData.country}
                      onChange={(e) => updateFormData("country", e.target.value)}
                      placeholder="Enter country"
                      className="h-11 border-border focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
                    />
                  </div>
                </div>
              </div>

              {/* Address Section */}
              <div className="space-y-6">
                <div className="flex items-center gap-3 pb-3 border-b border-border/50">
                  <div className="w-2 h-2 rounded-full bg-deep-koamaru"></div>
                  <h3 className="text-lg font-semibold text-foreground">
                    Address Information
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="street" className="text-sm font-semibold text-foreground">
                      Street
                    </Label>
                    <Input
                      id="street"
                      value={formData.address.street}
                      onChange={(e) => updateFormData("address.street", e.target.value)}
                      placeholder="Enter street address"
                      className="h-11 border-border focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="city" className="text-sm font-semibold text-foreground">
                      City
                    </Label>
                    <Input
                      id="city"
                      value={formData.address.city}
                      onChange={(e) => updateFormData("address.city", e.target.value)}
                      placeholder="Enter city"
                      className="h-11 border-border focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="state" className="text-sm font-semibold text-foreground">
                      State
                    </Label>
                    <Input
                      id="state"
                      value={formData.address.state}
                      onChange={(e) => updateFormData("address.state", e.target.value)}
                      placeholder="Enter state"
                      className="h-11 border-border focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="zipCode" className="text-sm font-semibold text-foreground">
                      ZIP Code
                    </Label>
                    <Input
                      id="zipCode"
                      value={formData.address.zipCode}
                      onChange={(e) => updateFormData("address.zipCode", e.target.value)}
                      placeholder="Enter ZIP code"
                      className="h-11 border-border focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="addressCountry" className="text-sm font-semibold text-foreground">
                      Address Country
                    </Label>
                    <Input
                      id="addressCountry"
                      value={formData.address.country}
                      onChange={(e) => updateFormData("address.country", e.target.value)}
                      placeholder="Enter country"
                      className="h-11 border-border focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
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
                    <Label htmlFor="studentCode" className="text-sm font-semibold text-foreground">
                      Student Code <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="studentCode"
                      value={formData.studentProfile.studentCode}
                      onChange={(e) => updateFormData("studentProfile.studentCode", e.target.value)}
                      placeholder="Enter student code"
                      className="h-11 border-border focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
                      disabled={!isCreate}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="programId" className="text-sm font-semibold text-foreground">
                      Program <span className="text-destructive">*</span>
                    </Label>
                    <Select
                      value={formData.studentProfile.programId || ""}
                      onValueChange={(value) => updateFormData("studentProfile.programId", value)}
                    >
                      <SelectTrigger className="w-full h-11 border-border focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200">
                        <SelectValue placeholder="Select program" />
                      </SelectTrigger>
                      <SelectContent>
                        {!programs ? (
                          <div className="text-center py-8">Loading programs...</div>
                        ) : programs.length === 0 ? (
                          <div className="text-center py-8">No programs available</div>
                        ) : (
                          programs.map((program) => (
                            <SelectItem key={program._id} value={program._id}>
                              {program.code} - {program.nameEs}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="enrollmentDate" className="text-sm font-semibold text-foreground">
                      Enrollment Date <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="enrollmentDate"
                      type="date"
                      value={formData.studentProfile.enrollmentDate}
                      onChange={(e) => updateFormData("studentProfile.enrollmentDate", e.target.value)}
                      className="h-11 border-border focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="expectedGraduationDate" className="text-sm font-semibold text-foreground">
                      Expected Graduation Date
                    </Label>
                    <Input
                      id="expectedGraduationDate"
                      type="date"
                      value={formData.studentProfile.expectedGraduationDate}
                      onChange={(e) => updateFormData("studentProfile.expectedGraduationDate", e.target.value)}
                      className="h-11 border-border focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="status" className="text-sm font-semibold text-foreground">
                      Status <span className="text-destructive">*</span>
                    </Label>
                    <Select
                      value={formData.studentProfile.status || ""}
                      onValueChange={(value) => updateFormData("studentProfile.status", value)}
                    >
                      <SelectTrigger className="w-full h-11 border-border focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                        <SelectItem value="on_leave">On Leave</SelectItem>
                        <SelectItem value="graduated">Graduated</SelectItem>
                        <SelectItem value="withdrawn">Withdrawn</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="academicStanding" className="text-sm font-semibold text-foreground">
                      Academic Standing
                    </Label>
                    <Select
                      value={formData.studentProfile.academicStanding || ""}
                      onValueChange={(value) => updateFormData("studentProfile.academicStanding", value)}
                    >
                      <SelectTrigger className="w-full h-11 border-border focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200">
                        <SelectValue placeholder="Select academic standing" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="good_standing">Good Standing</SelectItem>
                        <SelectItem value="probation">Probation</SelectItem>
                        <SelectItem value="suspension">Suspension</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="isActive" className="text-sm font-semibold text-foreground">
                      Active Status
                    </Label>
                    <Select
                      value={formData.isActive ? "true" : "false"}
                      onValueChange={(value) => updateFormData("isActive", value === "true")}
                    >
                      <SelectTrigger className="w-full h-11 border-border focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="true">Active</SelectItem>
                        <SelectItem value="false">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-border/30">
              <div className="flex flex-col sm:flex-row gap-3 w-full">
                {mode === "edit" && (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={handleDelete}
                    disabled={isLoading || isDeleting}
                    className="w-full sm:w-auto"
                  >
                    {isDeleting ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Deactivating...
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Trash2 className="h-4 w-4" />
                        Delete Student
                      </div>
                    )}
                  </Button>
                )}
                <Button
                  type="submit"
                  variant="default"
                  disabled={isLoading || isDeleting}
                  className="w-full sm:w-auto"
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      {isCreate ? "Creating..." : "Saving..."}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Save className="h-4 w-4" />
                      {isCreate ? "Create Student" : "Save Changes"}
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
                  Student Enrollments
                </h3>
              </div>

              {enrollmentHistory === undefined ? (
                <div className="text-center py-8">
                  <div className="flex flex-col items-center space-y-4">
                    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-muted-foreground">Loading enrollment history...</p>
                  </div>
                </div>
              ) : enrollmentHistory.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">
                    No enrollments found for this student.
                  </p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {enrollmentHistory.map((enrollment) => (
                    <div
                      key={enrollment._id}
                      className="flex items-center justify-between p-4 border border-border rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-3">
                          <span className="font-semibold text-foreground">
                            {enrollment.courseName}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            Section {enrollment.sectionInfo?.groupNumber || "N/A"}
                          </span>
                        </div>
                        <p className="text-sm text-foreground">
                          {enrollment.courseName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {enrollment.periodInfo?.nameEs || "N/A"} •
                          Enrolled: {new Date(enrollment._creationTime).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right space-y-1">
                        <span className={`text-xs px-2 py-1 rounded-full ${enrollment.status === 'enrolled' || enrollment.status === 'in_progress' ? 'bg-green-100 text-green-800' :
                          enrollment.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                            enrollment.status === 'withdrawn' ? 'bg-amber-100 text-amber-800' :
                              'bg-gray-100 text-gray-800'
                          }`}>
                          {enrollment.status}
                        </span>
                        {enrollment.percentageGrade !== undefined && enrollment.percentageGrade !== null && (
                          <div className="text-sm font-semibold text-foreground">
                            Grade: {enrollment.percentageGrade}%
                          </div>
                        )}
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
      {trigger}
      {dialogContent}
    </Dialog>
  );
}
