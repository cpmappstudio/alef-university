"use client";

import * as React from "react";
import { columnsProfessor } from "../columns";
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
import { Professor } from "../types";
import { ProfessorFormDialog } from "./professor-form-dialog";
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

type ProfessorTitleFilter =
  | "all"
  | "assistant"
  | "associate"
  | "full"
  | "emeritus"
  | "adjunct";

export default function ProfessorTable() {
  const [nameSearch, setNameSearch] = React.useState("");
  const [selectedDepartmentId, setSelectedDepartmentId] =
    React.useState<string>("all");
  const [departmentSearchOpen, setDepartmentSearchOpen] = React.useState(false);
  const [departmentSearchValue, setDepartmentSearchValue] = React.useState("");
  const [professorTitleFilter, setProfessorTitleFilter] =
    React.useState<ProfessorTitleFilter>("all");
  const [selectedProfessor, setSelectedProfessor] = React.useState<
    Professor | undefined
  >();
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = React.useState(false);

  // Mock data for demonstration
  const mockDepartments = [
    { _id: "1", code: "CS", name: "Computer Science" },
    { _id: "2", code: "BUS", name: "Business Administration" },
    { _id: "3", code: "MED", name: "Medicine" },
    { _id: "4", code: "ENG", name: "Engineering" },
  ];

  const mockProfessors: Professor[] = [
    {
      _id: "1" as any,
      clerkId: "clerk_prof_1",
      firstName: "Dr. María",
      lastName: "González",
      email: "maria.gonzalez@university.edu",
      dateOfBirth: new Date("1975-08-15").getTime(),
      phone: "+1-555-1001",
      address: {
        street: "123 Faculty Ave",
        city: "University City",
        state: "State",
        zipCode: "12345",
        country: "Country",
      },
      role: "professor" as const,
      isActive: true,
      createdAt: new Date().getTime(),
      professorProfile: {
        employeeCode: "PROF001",
        department: "Computer Science",
        title: "associate",
        hireDate: new Date("2010-08-15").getTime(),
      },
    },
    {
      _id: "2" as any,
      clerkId: "clerk_prof_2",
      firstName: "Dr. Carlos",
      lastName: "Rodríguez",
      email: "carlos.rodriguez@university.edu",
      dateOfBirth: new Date("1968-03-22").getTime(),
      phone: "+1-555-1002",
      address: {
        street: "456 Professor St",
        city: "University City",
        state: "State",
        zipCode: "23456",
        country: "Country",
      },
      role: "professor" as const,
      isActive: true,
      createdAt: new Date().getTime(),
      professorProfile: {
        employeeCode: "PROF002",
        department: "Business Administration",
        title: "full",
        hireDate: new Date("2005-01-15").getTime(),
      },
    },
    {
      _id: "3" as any,
      clerkId: "clerk_prof_3",
      firstName: "Dr. Ana",
      lastName: "Martínez",
      email: "ana.martinez@university.edu",
      dateOfBirth: new Date("1980-11-08").getTime(),
      phone: "+1-555-1003",
      address: {
        street: "789 Academic Rd",
        city: "University City",
        state: "State",
        zipCode: "34567",
        country: "Country",
      },
      role: "professor" as const,
      isActive: true,
      createdAt: new Date().getTime(),
      professorProfile: {
        employeeCode: "PROF003",
        department: "Medicine",
        title: "assistant",
        hireDate: new Date("2018-08-15").getTime(),
      },
    },
  ];

  // Filter professors based on all active filters
  const filteredProfessors = React.useMemo(() => {
    return mockProfessors.filter((professor) => {
      // Name search filter
      const nameMatch =
        nameSearch === "" ||
        professor.firstName?.toLowerCase().includes(nameSearch.toLowerCase()) ||
        professor.lastName?.toLowerCase().includes(nameSearch.toLowerCase()) ||
        professor.professorProfile.employeeCode
          ?.toLowerCase()
          .includes(nameSearch.toLowerCase());

      // Department filter
      const departmentMatch =
        selectedDepartmentId === "all" ||
        professor.professorProfile.department === selectedDepartmentId;

      // Title filter
      const titleMatch =
        professorTitleFilter === "all" ||
        professor.professorProfile.title === professorTitleFilter;

      return nameMatch && departmentMatch && titleMatch;
    });
  }, [mockProfessors, nameSearch, selectedDepartmentId, professorTitleFilter]);

  const handleRowClick = (professor: Professor) => {
    setSelectedProfessor(professor);
    setIsEditDialogOpen(true);
  };

  // Count active filters
  const activeFiltersCount = React.useMemo(() => {
    let count = 0;
    if (selectedDepartmentId !== "all") count++;
    if (professorTitleFilter !== "all") count++;
    return count;
  }, [selectedDepartmentId, professorTitleFilter]);

  // Get selected department name for display
  const selectedDepartmentName = React.useMemo(() => {
    if (selectedDepartmentId === "all") return "All Departments";
    const department = mockDepartments.find(
      (d) => d.name === selectedDepartmentId,
    );
    return department
      ? `${department.code} - ${department.name}`
      : "All Departments";
  }, [selectedDepartmentId]);

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
                        placeholder="Search by name, employee code..."
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
                          {/* Department Filter */}
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">
                              Department
                            </label>
                            <Popover
                              open={departmentSearchOpen}
                              onOpenChange={setDepartmentSearchOpen}
                            >
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  role="combobox"
                                  aria-expanded={departmentSearchOpen}
                                  className="w-full h-9 justify-between bg-background border-border/50 shadow-sm transition-colors hover:bg-accent/50"
                                >
                                  <span className="truncate">
                                    {selectedDepartmentName}
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
                                    placeholder="Search departments..."
                                    value={departmentSearchValue}
                                    onValueChange={setDepartmentSearchValue}
                                  />
                                  <CommandList>
                                    <CommandEmpty>
                                      No departments found.
                                    </CommandEmpty>
                                    <CommandGroup>
                                      <CommandItem
                                        value="all"
                                        onSelect={() => {
                                          setSelectedDepartmentId("all");
                                          setDepartmentSearchValue("");
                                          setDepartmentSearchOpen(false);
                                        }}
                                      >
                                        <Check
                                          className={`mr-2 h-4 w-4 ${
                                            selectedDepartmentId === "all"
                                              ? "opacity-100"
                                              : "opacity-0"
                                          }`}
                                        />
                                        All Departments
                                      </CommandItem>
                                      {mockDepartments.map((department) => (
                                        <CommandItem
                                          key={department._id}
                                          value={`${department.code} ${department.name}`}
                                          onSelect={() => {
                                            setSelectedDepartmentId(
                                              department.name,
                                            );
                                            setDepartmentSearchValue("");
                                            setDepartmentSearchOpen(false);
                                          }}
                                        >
                                          <Check
                                            className={`mr-2 h-4 w-4 ${
                                              selectedDepartmentId ===
                                              department.name
                                                ? "opacity-100"
                                                : "opacity-0"
                                            }`}
                                          />
                                          {department.code} - {department.name}
                                        </CommandItem>
                                      ))}
                                    </CommandGroup>
                                  </CommandList>
                                </Command>
                              </PopoverContent>
                            </Popover>
                          </div>

                          {/* Title Filter */}
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">
                              Academic Title
                            </label>
                            <Select
                              value={professorTitleFilter}
                              onValueChange={(value) =>
                                setProfessorTitleFilter(
                                  value as ProfessorTitleFilter,
                                )
                              }
                            >
                              <SelectTrigger className="w-full h-9 bg-background border-border/50 shadow-sm">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">All Titles</SelectItem>
                                <SelectItem value="assistant">
                                  Assistant Professor
                                </SelectItem>
                                <SelectItem value="associate">
                                  Associate Professor
                                </SelectItem>
                                <SelectItem value="full">
                                  Full Professor
                                </SelectItem>
                                <SelectItem value="emeritus">
                                  Professor Emeritus
                                </SelectItem>
                                <SelectItem value="adjunct">
                                  Adjunct Professor
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
                                  setSelectedDepartmentId("all");
                                  setProfessorTitleFilter("all");
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

                    {/* Create Professor Button */}
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
            columns={columnsProfessor}
            data={filteredProfessors}
            onRowClick={handleRowClick}
            primaryAction={null}
            mobileColumns={{
              primaryColumn: "name",
              secondaryColumn: "status",
            }}
            emptyState={{
              title: "No professors found",
              description: "No professors match the current filters.",
            }}
            entityName="professor"
          />
        </div>
      </div>

      {/* Edit Professor Dialog */}
      <ProfessorFormDialog
        mode="edit"
        professor={selectedProfessor}
        open={isEditDialogOpen}
        onOpenChange={(open) => {
          setIsEditDialogOpen(open);
          if (!open) setSelectedProfessor(undefined);
        }}
      />

      {/* Create Professor Dialog */}
      <ProfessorFormDialog
        mode="create"
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
      />
    </div>
  );
}
