"use client";

import * as React from "react";
import { columnsStudent } from "../columns";
import { DataTable } from "../../ui/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Plus,
  Filter,
  ChevronDown,
  Check,
  ChevronsUpDown,
  Search,
} from "lucide-react";
import { Student } from "../types";
import { StudentFormDialog } from "./student-form-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

type StudentStatusFilter =
  | "all"
  | "active"
  | "inactive"
  | "on_leave"
  | "graduated"
  | "withdrawn";

export default function StudentTable() {
  const [nameSearch, setNameSearch] = React.useState("");
  const [selectedProgramId, setSelectedProgramId] =
    React.useState<string>("all");
  const [programSearchOpen, setProgramSearchOpen] = React.useState(false);
  const [programSearchValue, setProgramSearchValue] = React.useState("");
  const [studentStatusFilter, setStudentStatusFilter] =
    React.useState<StudentStatusFilter>("all");
  const [selectedStudent, setSelectedStudent] = React.useState<
    Student | undefined
  >();
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = React.useState(false);

  // Mock data for demonstration
  const mockPrograms = [
    {
      _id: "1",
      code: "CS",
      nameEs: "Ciencias de la Computación",
      isActive: true,
    },
    {
      _id: "2",
      code: "BUS",
      nameEs: "Administración de Empresas",
      isActive: true,
    },
    { _id: "3", code: "MED", nameEs: "Medicina", isActive: true },
    { _id: "4", code: "ENG", nameEs: "Ingeniería", isActive: true },
  ];

  const mockStudents: Student[] = [
    {
      _id: "1" as any,
      clerkId: "clerk_1",
      firstName: "Juan",
      lastName: "Pérez",
      email: "juan.perez@university.edu",
      dateOfBirth: new Date("1998-05-15").getTime(),
      phone: "+1-555-0123",
      address: {
        street: "123 Main St",
        city: "City",
        state: "State",
        zipCode: "12345",
        country: "Country",
      },
      role: "student" as const,
      isActive: true,
      createdAt: new Date().getTime(),
      studentProfile: {
        studentCode: "STU001",
        programId: "1" as any,
        enrollmentDate: new Date("2020-08-15").getTime(),
        expectedGraduationDate: new Date("2024-05-15").getTime(),
        status: "active" as const,
        academicStanding: "good_standing" as const,
      },
    },
    {
      _id: "2" as any,
      clerkId: "clerk_2",
      firstName: "Ana",
      lastName: "García",
      email: "ana.garcia@university.edu",
      dateOfBirth: new Date("1999-03-22").getTime(),
      phone: "+1-555-0234",
      address: {
        street: "456 Oak Ave",
        city: "City",
        state: "State",
        zipCode: "23456",
        country: "Country",
      },
      role: "student" as const,
      isActive: true,
      createdAt: new Date().getTime(),
      studentProfile: {
        studentCode: "STU002",
        programId: "2" as any,
        enrollmentDate: new Date("2021-01-15").getTime(),
        expectedGraduationDate: new Date("2025-01-15").getTime(),
        status: "active" as const,
        academicStanding: "good_standing" as const,
      },
    },
    {
      _id: "3" as any,
      clerkId: "clerk_3",
      firstName: "Carlos",
      lastName: "Rodríguez",
      email: "carlos.rodriguez@university.edu",
      dateOfBirth: new Date("1997-11-08").getTime(),
      phone: "+1-555-0345",
      address: {
        street: "789 Pine St",
        city: "City",
        state: "State",
        zipCode: "34567",
        country: "Country",
      },
      role: "student" as const,
      isActive: true,
      createdAt: new Date().getTime(),
      studentProfile: {
        studentCode: "STU003",
        programId: "3" as any,
        enrollmentDate: new Date("2019-08-15").getTime(),
        expectedGraduationDate: new Date("2024-08-15").getTime(),
        status: "graduated" as const,
        academicStanding: "good_standing" as const,
      },
    },
  ];

  // Filter students based on all active filters
  const filteredStudents = React.useMemo(() => {
    return mockStudents.filter((student) => {
      // Name search filter
      const nameMatch =
        nameSearch === "" ||
        student.firstName?.toLowerCase().includes(nameSearch.toLowerCase()) ||
        student.lastName?.toLowerCase().includes(nameSearch.toLowerCase()) ||
        student.studentProfile.studentCode
          ?.toLowerCase()
          .includes(nameSearch.toLowerCase());

      // Program filter
      const programMatch =
        selectedProgramId === "all" ||
        student.studentProfile.programId === selectedProgramId;

      // Status filter
      const statusMatch =
        studentStatusFilter === "all" ||
        student.studentProfile.status === studentStatusFilter;

      return nameMatch && programMatch && statusMatch;
    });
  }, [mockStudents, nameSearch, selectedProgramId, studentStatusFilter]);

  const handleRowClick = (student: Student) => {
    setSelectedStudent(student);
    setIsEditDialogOpen(true);
  };

  // Count active filters
  const activeFiltersCount = React.useMemo(() => {
    let count = 0;
    if (selectedProgramId !== "all") count++;
    if (studentStatusFilter !== "all") count++;
    return count;
  }, [selectedProgramId, studentStatusFilter]);

  // Get selected program name for display
  const selectedProgramName = React.useMemo(() => {
    if (selectedProgramId === "all") return "All Programs";
    const program = mockPrograms.find((p) => p._id === selectedProgramId);
    return program ? `${program.code} - ${program.nameEs}` : "All Programs";
  }, [selectedProgramId]);

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Integrated Container - Header and Data Table */}
      <div className="bg-card rounded-xl border border-border/50 shadow-sm overflow-hidden mx-1 sm:mx-0">
        {/* Header Section with Filters */}
        <div className="p-3 sm:p-4 lg:p-6 border-b border-border/30 bg-card">
          <div className="space-y-4">
            {/* Header with Title and Filters */}
            <div className="space-y-4">
              {/* Filters Section */}
              <div className="space-y-4">
                {/* Filters Section */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  {/* Name Search */}
                  <div className="flex-1 w-full sm:w-auto">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search by name, student code..."
                        value={nameSearch}
                        onChange={(e) => setNameSearch(e.target.value)}
                        className="pl-10 h-10 bg-background border-border/50 shadow-sm transition-colors focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                  </div>

                  {/* Filters Dropdown and Create Button */}
                  <div className="flex items-center gap-3">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          className="h-10 px-3 border-border/50 shadow-sm transition-colors hover:bg-accent/50"
                        >
                          <Filter className="h-4 w-4" />
                          {activeFiltersCount > 0 && (
                            <span className="ml-2 bg-primary text-primary-foreground text-xs rounded-full px-2 py-0.5 min-w-[1.25rem] h-5 flex items-center justify-center">
                              {activeFiltersCount}
                            </span>
                          )}
                          <ChevronDown className="h-4 w-4 ml-2" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-80 p-4" align="end">
                        <div className="space-y-4">
                          {/* Program Filter */}
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">
                              Program
                            </label>
                            <Popover
                              open={programSearchOpen}
                              onOpenChange={setProgramSearchOpen}
                            >
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  role="combobox"
                                  aria-expanded={programSearchOpen}
                                  className="w-full h-9 justify-between bg-background border-border/50 shadow-sm transition-colors hover:bg-accent/50"
                                >
                                  <span className="truncate">
                                    {selectedProgramName}
                                  </span>
                                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent
                                className="w-full p-0"
                                align="start"
                              >
                                <Command>
                                  <CommandInput
                                    placeholder="Search programs..."
                                    value={programSearchValue}
                                    onValueChange={setProgramSearchValue}
                                  />
                                  <CommandList>
                                    <CommandEmpty>
                                      No programs found.
                                    </CommandEmpty>
                                    <CommandGroup>
                                      <CommandItem
                                        value="all"
                                        onSelect={() => {
                                          setSelectedProgramId("all");
                                          setProgramSearchValue("");
                                          setProgramSearchOpen(false);
                                        }}
                                      >
                                        <Check
                                          className={`mr-2 h-4 w-4 ${
                                            selectedProgramId === "all"
                                              ? "opacity-100"
                                              : "opacity-0"
                                          }`}
                                        />
                                        All Programs
                                      </CommandItem>
                                      {mockPrograms.map((program) => (
                                        <CommandItem
                                          key={program._id}
                                          value={`${program.code} ${program.nameEs}`}
                                          onSelect={() => {
                                            setSelectedProgramId(program._id);
                                            setProgramSearchValue("");
                                            setProgramSearchOpen(false);
                                          }}
                                        >
                                          <Check
                                            className={`mr-2 h-4 w-4 ${
                                              selectedProgramId === program._id
                                                ? "opacity-100"
                                                : "opacity-0"
                                            }`}
                                          />
                                          {program.code} - {program.nameEs}
                                        </CommandItem>
                                      ))}
                                    </CommandGroup>
                                  </CommandList>
                                </Command>
                              </PopoverContent>
                            </Popover>
                          </div>

                          {/* Status Filter */}
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">
                              Status
                            </label>
                            <Select
                              value={studentStatusFilter}
                              onValueChange={(value) =>
                                setStudentStatusFilter(
                                  value as StudentStatusFilter,
                                )
                              }
                            >
                              <SelectTrigger className="w-full h-9 bg-background border-border/50 shadow-sm">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">
                                  All Statuses
                                </SelectItem>
                                <SelectItem value="active">Active</SelectItem>
                                <SelectItem value="inactive">
                                  Inactive
                                </SelectItem>
                                <SelectItem value="on_leave">
                                  On Leave
                                </SelectItem>
                                <SelectItem value="graduated">
                                  Graduated
                                </SelectItem>
                                <SelectItem value="withdrawn">
                                  Withdrawn
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Clear Filters Button */}
                          {activeFiltersCount > 0 && (
                            <div className="pt-2 border-t border-border/30">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedProgramId("all");
                                  setStudentStatusFilter("all");
                                }}
                                className="w-full h-8 text-xs"
                              >
                                Clear All Filters
                              </Button>
                            </div>
                          )}
                        </div>
                      </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Create Student Button */}
                    <Button
                      variant="default"
                      className="h-10 px-4 font-medium shadow-sm"
                      onClick={() => setIsCreateDialogOpen(true)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Data Table Section */}
        <div className="p-0">
          <DataTable
            columns={columnsStudent}
            data={filteredStudents}
            onRowClick={handleRowClick}
            primaryAction={
              null
            }
            mobileColumns={{
              primaryColumn: "name",
              secondaryColumn: "status",
            }}
            emptyState={{
              title: "No students found",
              description: "No students match the current filters.",
            }}
            entityName="student"
          />
        </div>
      </div>

      {/* Edit Student Dialog */}
      <StudentFormDialog
        mode="edit"
        student={selectedStudent}
        open={isEditDialogOpen}
        onOpenChange={(open) => {
          setIsEditDialogOpen(open);
          if (!open) setSelectedStudent(undefined);
        }}
      />

      {/* Create Student Dialog */}
      <StudentFormDialog
        mode="create"
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
      />
    </div>
  );
}
