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
import { useMutation, useQuery, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Professor } from "../types";

interface ProfessorFormData {
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
  professorProfile: {
    employeeCode: string;
    title: string;
    department: string;
    hireDate: string;
  };
}

interface ProfessorFormDialogProps {
  mode: "create" | "edit";
  professor?: Professor;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function ProfessorFormDialog({
  mode,
  professor,
  trigger,
  open: controlledOpen,
  onOpenChange,
}: ProfessorFormDialogProps) {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState("general");

  const adminCreateProfessor = useAction(api.admin.createUserWithClerk);
  const adminUpdateProfessor = useMutation(api.admin.adminUpdateProfessor);
  const deactivateUser = useMutation(api.auth.deactivateUser);

  const teachingHistory = useQuery(
    api.admin.getProfessorTeachingHistory,
    mode === 'edit' && professor ? { professorId: professor._id } : 'skip'
  );

  // Use controlled or internal state
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = onOpenChange || setInternalOpen;

  // Initialize form data based on mode and professor
  const initialFormData = React.useMemo((): ProfessorFormData => {
    // This function will now only run when professor data is available
    if (mode === "edit" && professor) {
      return {
        firstName: professor.firstName || "",
        lastName: professor.lastName || "",
        email: professor.email || "",
        dateOfBirth: professor.dateOfBirth ? new Date(professor.dateOfBirth).toISOString().split('T')[0] : "",
        nationality: professor.nationality || "",
        documentType: professor.documentType,
        documentNumber: professor.documentNumber || "",
        phone: professor.phone || "",
        country: professor.country || "",
        address: {
          street: professor.address?.street || "",
          city: professor.address?.city || "",
          state: professor.address?.state || "",
          zipCode: professor.address?.zipCode || "",
          country: professor.address?.country || "",
        },
        isActive: professor.isActive,
        professorProfile: {
          employeeCode: professor.professorProfile?.employeeCode || "",
          title: professor.professorProfile?.title || "",
          department: professor.professorProfile?.department || "",
          hireDate: professor.professorProfile?.hireDate
            ? new Date(professor.professorProfile.hireDate).toISOString().split('T')[0] : "",
        },
      };
    }
    // Default for create mode
    return {
      firstName: "", lastName: "", email: "", dateOfBirth: "",
      nationality: "", documentType: undefined, documentNumber: "", phone: "", country: "",
      address: { street: "", city: "", state: "", zipCode: "", country: "" },
      isActive: true,
      professorProfile: { employeeCode: "", title: "", department: "", hireDate: "" },
    };
  }, [mode, professor]);

  const [formData, setFormData] = React.useState(initialFormData);

  // Reset form when professor changes or dialog opens
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
        await adminCreateProfessor({
          email: formData.email,
          firstName: formData.firstName,
          lastName: formData.lastName,
          role: "professor",
          professorProfile: {
            employeeCode: formData.professorProfile.employeeCode,
            title: formData.professorProfile.title || undefined,
            department: formData.professorProfile.department || undefined,
            hireDate: formData.professorProfile.hireDate
              ? new Date(formData.professorProfile.hireDate).getTime()
              : undefined,
          },
        });
        alert("Professor created successfully and an invitation has been sent.");
      } else {
        if (!professor) return;
        await adminUpdateProfessor({
          professorId: professor._id,
          firstName: formData.firstName,
          lastName: formData.lastName,
          isActive: formData.isActive,
          title: formData.professorProfile.title || undefined,
          department: formData.professorProfile.department || undefined,
        });
        alert("Professor updated successfully!");
      }
      setOpen(false);
    } catch (error) {
      console.error(`Failed to ${mode} professor:`, error);
      alert(`Failed to ${mode} professor: ${(error as Error).message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!professor || mode === "create") return;
    if (!confirm(`Are you sure you want to deactivate "${professor.firstName} ${professor.lastName}"?`)) {
      return;
    }
    setIsDeleting(true);
    try {
      await deactivateUser({ userId: professor._id });
      alert("Professor deactivated successfully!");
      setOpen(false);
    } catch (error) {
      console.error("Failed to deactivate professor:", error);
      alert(`Failed to deactivate professor: ${(error as Error).message}`);
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
  const validateFormData = (data: ProfessorFormData): string[] => {
    const errors: string[] = [];

    if (!data.firstName.trim()) errors.push("First name is required");
    if (!data.lastName.trim()) errors.push("Last name is required");
    if (!data.email.trim()) errors.push("Email is required");
    if (!data.professorProfile.employeeCode.trim()) errors.push("Employee code is required");

    return errors;
  };

  const isCreate = mode === "create";
  const dialogTitle = isCreate ? "Create New Professor" : "Edit Professor";
  const dialogDescription = isCreate
    ? "Fill in the information below to create a new professor"
    : "Update the professor information below";

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
            Teaching History
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
                      className=" border-border focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
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
                      className=" border-border focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
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
                      className=" border-border focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
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
                      className=" border-border focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
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
                      className=" border-border focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
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
                      <SelectTrigger className="w-full  border-border focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200">
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
                      className=" border-border focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
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
                      className=" border-border focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
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
                      className=" border-border focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
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
                      className=" border-border focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
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
                      className=" border-border focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
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
                      className=" border-border focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
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
                      className=" border-border focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
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
                      className=" border-border focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
                    />
                  </div>
                </div>
              </div>

              {/* Professional Information Section */}
              <div className="space-y-6">
                <div className="flex items-center gap-3 pb-3 border-b border-border/50">
                  <div className="w-2 h-2 rounded-full bg-deep-koamaru"></div>
                  <h3 className="text-lg font-semibold text-foreground">
                    Professional Information
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="employeeCode" className="text-sm font-semibold text-foreground">
                      Employee Code <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="employeeCode"
                      value={formData.professorProfile.employeeCode}
                      onChange={(e) => updateFormData("professorProfile.employeeCode", e.target.value)}
                      placeholder="Enter employee code"
                      className=" border-border focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
                      disabled={!isCreate}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="title" className="text-sm font-semibold text-foreground">
                      Academic Title
                    </Label>
                    <Select
                      value={formData.professorProfile.title || ""}
                      onValueChange={(value) => updateFormData("professorProfile.title", value)}
                    >
                      <SelectTrigger className="w-full  border-border focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200">
                        <SelectValue placeholder="Select academic title" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="assistant">Assistant Professor</SelectItem>
                        <SelectItem value="associate">Associate Professor</SelectItem>
                        <SelectItem value="full">Full Professor</SelectItem>
                        <SelectItem value="emeritus">Professor Emeritus</SelectItem>
                        <SelectItem value="adjunct">Adjunct Professor</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="department" className="text-sm font-semibold text-foreground">
                      Department
                    </Label>
                    <Input
                      id="department"
                      value={formData.professorProfile.department}
                      onChange={(e) => updateFormData("professorProfile.department", e.target.value)}
                      placeholder="Enter department"
                      className=" border-border focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="hireDate" className="text-sm font-semibold text-foreground">
                      Hire Date
                    </Label>
                    <Input
                      id="hireDate"
                      type="date"
                      value={formData.professorProfile.hireDate}
                      onChange={(e) => updateFormData("professorProfile.hireDate", e.target.value)}
                      className=" border-border focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
                    />
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
                      <SelectTrigger className="w-full  border-border focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200">
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
                        Delete Professor
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
                      {isCreate ? "Create Professor" : "Save Changes"}
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
                  Teaching History
                </h3>
              </div>

              {teachingHistory === undefined ? (
                <div className="text-center py-8">Loading teaching history...</div>
              ) : !teachingHistory || teachingHistory.length === 0 ? (
                <div className="text-center py-8">No teaching history available.</div>
              ) : (
                <div className="space-y-6 max-h-[400px] overflow-y-auto">
                  {/* Group sections by period */}
                  {Object.entries(
                    teachingHistory.reduce((acc: Record<string, any[]>, section) => {
                      const periodKey = `${section.periodName || 'Unknown'} (${new Date(section.periodId).getFullYear()})`;
                      if (!acc[periodKey]) acc[periodKey] = [];
                      acc[periodKey].push(section);
                      return acc;
                    }, {})
                  ).map(([periodName, sections], index) => (
                    <div key={index} className="space-y-3">
                      <h4 className="font-medium text-foreground">{periodName}</h4>

                      {sections.map((section, sIdx) => (
                        <div
                          key={`${index}-${sIdx}`}
                          className="flex items-center justify-between p-4 border border-border rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-3">
                              <span className="font-semibold text-foreground">
                                {section.courseCode}
                              </span>
                              <span className="text-sm text-muted-foreground">
                                Group {section.groupNumber}
                              </span>
                            </div>
                            <p className="text-sm text-foreground">
                              {section.courseName}
                            </p>
                            {section.schedule && (
                              <p className="text-xs text-muted-foreground">
                                {section.schedule.sessions?.map((session: any) =>
                                  `${session.day.charAt(0).toUpperCase() + session.day.slice(1)} ${session.startTime}-${session.endTime}`
                                ).join(', ')}
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground">
                              {section.enrolled}/{section.capacity} students
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}

              {teachingHistory && teachingHistory.length > 0 && (
                <div className="pt-4 mt-4 border-t border-border/50">
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                    <div className="p-3 bg-muted/30 rounded-lg text-center">
                      <p className="text-xs text-muted-foreground">Total Sections</p>
                      <p className="text-lg font-semibold text-foreground">{teachingHistory.length}</p>
                    </div>
                    <div className="p-3 bg-muted/30 rounded-lg text-center">
                      <p className="text-xs text-muted-foreground">Total Periods</p>
                      <p className="text-lg font-semibold text-foreground">
                        {new Set(teachingHistory.map(s => s.periodId)).size}
                      </p>
                    </div>
                    <div className="p-3 bg-muted/30 rounded-lg text-center">
                      <p className="text-xs text-muted-foreground">Students Taught</p>
                      <p className="text-lg font-semibold text-foreground">
                        {teachingHistory.reduce((sum, s) => sum + s.enrolled, 0)}
                      </p>
                    </div>
                    <div className="p-3 bg-muted/30 rounded-lg text-center">
                      <p className="text-xs text-muted-foreground">Courses Delivered</p>
                      <p className="text-lg font-semibold text-foreground">
                        {new Set(teachingHistory.map(s => s.courseId)).size}
                      </p>
                    </div>
                  </div>
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
