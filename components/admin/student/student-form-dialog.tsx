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

// Mock enrollments data for the details tab
const mockEnrollments = [
  {
    _id: "1",
    studentId: "1",
    sectionId: "1",
    periodId: "1",
    courseCode: "CS101",
    courseName: "Introduction to Computer Science",
    sectionCode: "A",
    periodName: "Fall 2024",
    status: "active",
    enrollmentDate: "2024-08-15",
    grade: null,
  },
  {
    _id: "2",
    studentId: "1", 
    sectionId: "2",
    periodId: "1",
    courseCode: "MATH201",
    courseName: "Calculus I",
    sectionCode: "B",
    periodName: "Fall 2024",
    status: "completed",
    enrollmentDate: "2024-08-15",
    grade: "A",
  },
];

// Mock programs data for the dropdown
const mockPrograms = [
  { _id: "1", code: "CS", nameEs: "Ciencias de la Computación" },
  { _id: "2", code: "BUS", nameEs: "Administración de Empresas" },
  { _id: "3", code: "MED", nameEs: "Medicina" },
  { _id: "4", code: "ENG", nameEs: "Ingeniería" },
];

interface StudentFormData {
  firstName: string;
  lastName: string;
  secondLastName: string;
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

  // Use controlled or internal state
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = onOpenChange || setInternalOpen;

  // Initialize form data based on mode and student
  const initialFormData = React.useMemo((): StudentFormData => {
    if (mode === "edit" && student) {
      return {
        firstName: student.firstName,
        lastName: student.lastName,
        secondLastName: student.secondLastName || "",
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
          studentCode: student.studentProfile.studentCode,
          programId: student.studentProfile.programId as string,
          enrollmentDate: new Date(student.studentProfile.enrollmentDate).toISOString().split('T')[0],
          expectedGraduationDate: student.studentProfile.expectedGraduationDate 
            ? new Date(student.studentProfile.expectedGraduationDate).toISOString().split('T')[0] : "",
          status: student.studentProfile.status,
          academicStanding: student.studentProfile.academicStanding,
        },
      };
    }
    // For create mode
    return {
      firstName: "",
      lastName: "",
      secondLastName: "",
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
      alert(`Please fix the following errors:\n\n${validationErrors.join('\n')}`);
      return;
    }

    setIsLoading(true);

    try {
      if (mode === "create") {
        // Mock create logic
        console.log("Creating student:", formData);
        alert("Student created successfully!");
      } else {
        // Mock update logic
        console.log("Updating student:", formData);
        alert("Student updated successfully!");
      }

      setOpen(false);
    } catch (error) {
      console.error(`Failed to ${mode} student:`, error);
      alert(`Failed to ${mode} student. Please try again.`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!student || mode === "create") return;

    if (!confirm(`Are you sure you want to deactivate the student "${student.firstName} ${student.lastName}"?`)) {
      return;
    }

    setIsDeleting(true);

    try {
      // Mock delete logic
      console.log("Deactivating student:", student._id);
      alert("Student deactivated successfully!");
      setOpen(false);
    } catch (error) {
      console.error("Failed to deactivate student:", error);
      alert("Failed to deactivate student. Please try again.");
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
                    <Label htmlFor="secondLastName" className="text-sm font-semibold text-foreground">
                      Second Last Name
                    </Label>
                    <Input
                      id="secondLastName"
                      value={formData.secondLastName}
                      onChange={(e) => updateFormData("secondLastName", e.target.value)}
                      placeholder="Enter second last name"
                      className="h-11 border-border focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
                    />
                  </div>

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
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                        {mockPrograms.map((program) => (
                          <SelectItem key={program._id} value={program._id}>
                            {program.code} - {program.nameEs}
                          </SelectItem>
                        ))}
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

              {mockEnrollments.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">
                    No enrollments found for this student.
                  </p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {mockEnrollments.map((enrollment) => (
                    <div
                      key={enrollment._id}
                      className="flex items-center justify-between p-4 border border-border rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-3">
                          <span className="font-semibold text-foreground">
                            {enrollment.courseCode}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            Section {enrollment.sectionCode}
                          </span>
                        </div>
                        <p className="text-sm text-foreground">
                          {enrollment.courseName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {enrollment.periodName} • Enrolled: {enrollment.enrollmentDate}
                        </p>
                      </div>
                      <div className="text-right space-y-1">
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          enrollment.status === 'active' ? 'bg-green-100 text-green-800' :
                          enrollment.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {enrollment.status}
                        </span>
                        {enrollment.grade && (
                          <div className="text-sm font-semibold text-foreground">
                            Grade: {enrollment.grade}
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
