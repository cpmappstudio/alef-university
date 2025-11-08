"use client";

import * as React from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { columnsEnrollment } from "../columns";
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
  Loader2,
} from "lucide-react";
import { Enrollment } from "../types";
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
import { Id } from "@/convex/_generated/dataModel";
import { EnrollmentFormDialog } from "./enrollment-form-dialog";

type EnrollmentStatusFilter =
  | "all"
  | "enrolled"
  | "withdrawn"
  | "dropped"
  | "completed"
  | "failed"
  | "incomplete"
  | "in_progress";

export default function EnrollmentTable() {
  const [nameSearch, setNameSearch] = React.useState("");

  // Student filter states
  const [selectedStudentId, setSelectedStudentId] = React.useState<
    Id<"users"> | "all" | undefined
  >("all");
  const [studentSearchOpen, setStudentSearchOpen] = React.useState(false);
  const [studentSearchValue, setStudentSearchValue] = React.useState("");

  // Course filter states
  const [selectedCourseId, setSelectedCourseId] = React.useState<
    Id<"courses"> | "all" | undefined
  >("all");
  const [courseSearchOpen, setCourseSearchOpen] = React.useState(false);
  const [courseSearchValue, setCourseSearchValue] = React.useState("");

  // Section filter states
  const [selectedSectionId, setSelectedSectionId] = React.useState<
    Id<"sections"> | "all" | undefined
  >("all");
  const [sectionSearchOpen, setSectionSearchOpen] = React.useState(false);
  const [sectionSearchValue, setSectionSearchValue] = React.useState("");

  // Period filter states
  const [selectedPeriodId, setSelectedPeriodId] = React.useState<
    Id<"periods"> | "all" | undefined
  >("all");
  const [periodSearchOpen, setPeriodSearchOpen] = React.useState(false);
  const [periodSearchValue, setPeriodSearchValue] = React.useState("");

  // Status filter
  const [enrollmentStatusFilter, setEnrollmentStatusFilter] =
    React.useState<EnrollmentStatusFilter>("all");

  // Dialog states
  const [selectedEnrollment, setSelectedEnrollment] = React.useState<
    Enrollment | undefined
  >();
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = React.useState(false);

  // Fetch real data for filters
  const students = useQuery(api.admin.getAllUsers, { role: "student" });
  const courses = useQuery(api.courses.getAllCourses, {});
  const sections = useQuery(api.admin.adminGetSections, {});
  const periods = useQuery(api.admin.getAllPeriods, {});

  // Fetch enrollments with filters
  const enrollments = useQuery(api.admin.getAdminEnrollments, {
    studentId: selectedStudentId === "all" ? undefined : selectedStudentId as Id<"users">,
    courseId: selectedCourseId === "all" ? undefined : selectedCourseId as Id<"courses">,
    sectionId: selectedSectionId === "all" ? undefined : selectedSectionId as Id<"sections">,
    periodId: selectedPeriodId === "all" ? undefined : selectedPeriodId as Id<"periods">,
    status: enrollmentStatusFilter === "all" ? undefined : enrollmentStatusFilter,
  });

  // Apply name search filter client-side
  const filteredEnrollments = React.useMemo(() => {
    if (!enrollments) return [];

    if (!nameSearch) return enrollments;

    return enrollments.filter(enrollment => {
      const searchLower = nameSearch.toLowerCase();
      return (
        enrollment.studentName?.toLowerCase().includes(searchLower) ||
        enrollment.studentEmail?.toLowerCase().includes(searchLower)
      );
    });
  }, [enrollments, nameSearch]);

  const handleRowClick = (enrollment: Enrollment) => {
    setSelectedEnrollment(enrollment);
    setIsEditDialogOpen(true);
  };

  const handleDialogClose = () => {
    setIsEditDialogOpen(false);
    setSelectedEnrollment(undefined);
  };

  const handleCreateDialogClose = () => {
    setIsCreateDialogOpen(false);
  };

  // Count active filters
  const activeFiltersCount = React.useMemo(() => {
    let count = 0;
    if (selectedStudentId !== "all") count++;
    if (selectedCourseId !== "all") count++;
    if (selectedSectionId !== "all") count++;
    if (selectedPeriodId !== "all") count++;
    if (enrollmentStatusFilter !== "all") count++;
    return count;
  }, [
    selectedStudentId,
    selectedCourseId,
    selectedSectionId,
    selectedPeriodId,
    enrollmentStatusFilter,
  ]);

  // Get selected names for display
  const selectedStudentName = React.useMemo(() => {
    if (selectedStudentId === "all") return "All Students";
    const student = students?.find((s) => s._id === selectedStudentId);
    return student ? `${student.firstName} ${student.lastName}` : "All Students";
  }, [selectedStudentId, students]);

  const selectedCourseName = React.useMemo(() => {
    if (selectedCourseId === "all") return "All Courses";
    const course = courses?.find((c) => c._id === selectedCourseId);
    return course ? `${course.code} - ${course.nameEs}` : "All Courses";
  }, [selectedCourseId, courses]);

  const selectedSectionName = React.useMemo(() => {
    if (selectedSectionId === "all") return "All Sections";
    const section = sections?.find((s) => s._id === selectedSectionId);
    return section ? `${section.groupNumber} (${section.courseCode})` : "All Sections";
  }, [selectedSectionId, sections]);

  const selectedPeriodName = React.useMemo(() => {
    if (selectedPeriodId === "all") return "All Periods";
    const period = periods?.find((p) => p._id === selectedPeriodId);
    return period ? `${period.code} - ${period.nameEs}` : "All Periods";
  }, [selectedPeriodId, periods]);

  // Show loading state when essential data is loading
  const isLoading = students === undefined || courses === undefined || periods === undefined || sections === undefined || enrollments === undefined;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px] bg-card rounded-xl border border-border/50 shadow-sm">
        <div className="flex flex-col items-center space-y-4 p-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground font-medium">
            Loading enrollment data...
          </p>
        </div>
      </div>
    );
  }

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
                        placeholder="Search enrollments by student name, email..."
                        value={nameSearch}
                        onChange={(e) => setNameSearch(e.target.value)}
                        className="pl-10 h-10 bg-background border-border/50 shadow-sm transition-colors focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                  </div>

                  {/* Filters Dropdown and Clear Button */}
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
                          {/* Student Filter */}
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">
                              Student
                            </label>
                            <Popover
                              open={studentSearchOpen}
                              onOpenChange={setStudentSearchOpen}
                            >
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  role="combobox"
                                  aria-expanded={studentSearchOpen}
                                  className="w-full h-9 justify-between bg-background border-border/50 shadow-sm transition-colors hover:bg-accent/50"
                                >
                                  <span className="truncate">
                                    {selectedStudentName}
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
                                    placeholder="Search students..."
                                    value={studentSearchValue}
                                    onValueChange={setStudentSearchValue}
                                  />
                                  <CommandList>
                                    <CommandEmpty>
                                      No students found.
                                    </CommandEmpty>
                                    <CommandGroup>
                                      <CommandItem
                                        value="all"
                                        onSelect={() => {
                                          setSelectedStudentId("all");
                                          setStudentSearchValue("");
                                          setStudentSearchOpen(false);
                                        }}
                                      >
                                        <Check
                                          className={`mr-2 h-4 w-4 ${selectedStudentId === "all"
                                              ? "opacity-100"
                                              : "opacity-0"
                                            }`}
                                        />
                                        All Students
                                      </CommandItem>
                                      {students
                                        ?.filter((student) => {
                                          if (!studentSearchValue) return true;
                                          const searchLower = studentSearchValue.toLowerCase();
                                          return (
                                            student.firstName?.toLowerCase().includes(searchLower) ||
                                            student.lastName?.toLowerCase().includes(searchLower) ||
                                            student.email?.toLowerCase().includes(searchLower)
                                          );
                                        })
                                        .map((student) => (
                                          <CommandItem
                                            key={student._id}
                                            value={`${student.firstName} ${student.lastName}`}
                                            onSelect={() => {
                                              setSelectedStudentId(student._id);
                                              setStudentSearchValue("");
                                              setStudentSearchOpen(false);
                                            }}
                                          >
                                            <Check
                                              className={`mr-2 h-4 w-4 ${selectedStudentId === student._id
                                                  ? "opacity-100"
                                                  : "opacity-0"
                                                }`}
                                            />
                                            {student.firstName} {student.lastName}
                                          </CommandItem>
                                        ))}
                                    </CommandGroup>
                                  </CommandList>
                                </Command>
                              </PopoverContent>
                            </Popover>
                          </div>

                          {/* Course Filter */}
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">
                              Course
                            </label>
                            <Popover
                              open={courseSearchOpen}
                              onOpenChange={setCourseSearchOpen}
                            >
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  role="combobox"
                                  aria-expanded={courseSearchOpen}
                                  className="w-full h-9 justify-between bg-background border-border/50 shadow-sm transition-colors hover:bg-accent/50"
                                >
                                  <span className="truncate">
                                    {selectedCourseName}
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
                                    placeholder="Search courses..."
                                    value={courseSearchValue}
                                    onValueChange={setCourseSearchValue}
                                  />
                                  <CommandList>
                                    <CommandEmpty>
                                      No courses found.
                                    </CommandEmpty>
                                    <CommandGroup>
                                      <CommandItem
                                        value="all"
                                        onSelect={() => {
                                          setSelectedCourseId("all");
                                          setCourseSearchValue("");
                                          setCourseSearchOpen(false);
                                        }}
                                      >
                                        <Check
                                          className={`mr-2 h-4 w-4 ${selectedCourseId === "all"
                                              ? "opacity-100"
                                              : "opacity-0"
                                            }`}
                                        />
                                        All Courses
                                      </CommandItem>
                                      {courses
                                        ?.filter((course) => {
                                          if (!courseSearchValue) return true;
                                          const searchLower = courseSearchValue.toLowerCase();
                                          return (
                                            course.code?.toLowerCase().includes(searchLower) ||
                                            course.codeEn?.toLowerCase().includes(searchLower) ||
                                            course.nameEs?.toLowerCase().includes(searchLower) ||
                                            course.nameEn?.toLowerCase().includes(searchLower)
                                          );
                                        })
                                        .map((course) => (
                                          <CommandItem
                                            key={course._id}
                                            value={`${course.code || course.codeEn || ""} ${course.nameEs || course.nameEn || ""}`}
                                            onSelect={() => {
                                              setSelectedCourseId(course._id);
                                              setCourseSearchValue("");
                                              setCourseSearchOpen(false);
                                            }}
                                          >
                                            <Check
                                              className={`mr-2 h-4 w-4 ${selectedCourseId === course._id
                                                  ? "opacity-100"
                                                  : "opacity-0"
                                                }`}
                                            />
                                            {course.code} - {course.nameEs}
                                          </CommandItem>
                                        ))}
                                    </CommandGroup>
                                  </CommandList>
                                </Command>
                              </PopoverContent>
                            </Popover>
                          </div>

                          {/* Section Filter */}
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">
                              Section
                            </label>
                            <Popover
                              open={sectionSearchOpen}
                              onOpenChange={setSectionSearchOpen}
                            >
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  role="combobox"
                                  aria-expanded={sectionSearchOpen}
                                  className="w-full h-9 justify-between bg-background border-border/50 shadow-sm transition-colors hover:bg-accent/50"
                                >
                                  <span className="truncate">
                                    {selectedSectionName}
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
                                    placeholder="Search sections..."
                                    value={sectionSearchValue}
                                    onValueChange={setSectionSearchValue}
                                  />
                                  <CommandList>
                                    <CommandEmpty>
                                      No sections found.
                                    </CommandEmpty>
                                    <CommandGroup>
                                      <CommandItem
                                        value="all"
                                        onSelect={() => {
                                          setSelectedSectionId("all");
                                          setSectionSearchValue("");
                                          setSectionSearchOpen(false);
                                        }}
                                      >
                                        <Check
                                          className={`mr-2 h-4 w-4 ${selectedSectionId === "all"
                                              ? "opacity-100"
                                              : "opacity-0"
                                            }`}
                                        />
                                        All Sections
                                      </CommandItem>
                                      {sections
                                        ?.filter((section) => {
                                          if (!sectionSearchValue) return true;
                                          const searchLower = sectionSearchValue.toLowerCase();
                                          return (
                                            section.groupNumber?.toString().toLowerCase().includes(searchLower) ||
                                            section.courseCode?.toLowerCase().includes(searchLower)
                                          );
                                        })
                                        .map((section) => (
                                          <CommandItem
                                            key={section._id}
                                            value={`${section.groupNumber} ${section.courseCode}`}
                                            onSelect={() => {
                                              setSelectedSectionId(section._id);
                                              setSectionSearchValue("");
                                              setSectionSearchOpen(false);
                                            }}
                                          >
                                            <Check
                                              className={`mr-2 h-4 w-4 ${selectedSectionId === section._id
                                                  ? "opacity-100"
                                                  : "opacity-0"
                                                }`}
                                            />
                                            {section.groupNumber} ({section.courseCode})
                                          </CommandItem>
                                        ))}
                                    </CommandGroup>
                                  </CommandList>
                                </Command>
                              </PopoverContent>
                            </Popover>
                          </div>

                          {/* Period Filter */}
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">
                              Period
                            </label>
                            <Popover
                              open={periodSearchOpen}
                              onOpenChange={setPeriodSearchOpen}
                            >
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  role="combobox"
                                  aria-expanded={periodSearchOpen}
                                  className="w-full h-9 justify-between bg-background border-border/50 shadow-sm transition-colors hover:bg-accent/50"
                                >
                                  <span className="truncate">
                                    {selectedPeriodName}
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
                                    placeholder="Search periods..."
                                    value={periodSearchValue}
                                    onValueChange={setPeriodSearchValue}
                                  />
                                  <CommandList>
                                    <CommandEmpty>
                                      No periods found.
                                    </CommandEmpty>
                                    <CommandGroup>
                                      <CommandItem
                                        value="all"
                                        onSelect={() => {
                                          setSelectedPeriodId("all");
                                          setPeriodSearchValue("");
                                          setPeriodSearchOpen(false);
                                        }}
                                      >
                                        <Check
                                          className={`mr-2 h-4 w-4 ${selectedPeriodId === "all"
                                              ? "opacity-100"
                                              : "opacity-0"
                                            }`}
                                        />
                                        All Periods
                                      </CommandItem>
                                      {periods
                                        ?.filter((period) => {
                                          if (!periodSearchValue) return true;
                                          const searchLower = periodSearchValue.toLowerCase();
                                          return (
                                            period.code.toLowerCase().includes(searchLower) ||
                                            period.nameEs.toLowerCase().includes(searchLower)
                                          );
                                        })
                                        .map((period) => (
                                          <CommandItem
                                            key={period._id}
                                            value={`${period.code} ${period.nameEs}`}
                                            onSelect={() => {
                                              setSelectedPeriodId(period._id);
                                              setPeriodSearchValue("");
                                              setPeriodSearchOpen(false);
                                            }}
                                          >
                                            <Check
                                              className={`mr-2 h-4 w-4 ${selectedPeriodId === period._id
                                                  ? "opacity-100"
                                                  : "opacity-0"
                                                }`}
                                            />
                                            {period.code} - {period.nameEs}
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
                              value={enrollmentStatusFilter}
                              onValueChange={(value) =>
                                setEnrollmentStatusFilter(
                                  value as EnrollmentStatusFilter,
                                )
                              }
                            >
                              <SelectTrigger className="w-full h-9 bg-background border-border/50 shadow-sm transition-colors hover:bg-accent/50">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-popover border-border/50 shadow-lg">
                                <SelectItem
                                  value="all"
                                  className="text-sm hover:bg-accent/50"
                                >
                                  All
                                </SelectItem>
                                <SelectItem
                                  value="enrolled"
                                  className="text-sm hover:bg-accent/50"
                                >
                                  Enrolled
                                </SelectItem>
                                <SelectItem
                                  value="in_progress"
                                  className="text-sm hover:bg-accent/50"
                                >
                                  In Progress
                                </SelectItem>
                                <SelectItem
                                  value="completed"
                                  className="text-sm hover:bg-accent/50"
                                >
                                  Completed
                                </SelectItem>
                                <SelectItem
                                  value="failed"
                                  className="text-sm hover:bg-accent/50"
                                >
                                  Failed
                                </SelectItem>
                                <SelectItem
                                  value="withdrawn"
                                  className="text-sm hover:bg-accent/50"
                                >
                                  Withdrawn
                                </SelectItem>
                                <SelectItem
                                  value="dropped"
                                  className="text-sm hover:bg-accent/50"
                                >
                                  Dropped
                                </SelectItem>
                                <SelectItem
                                  value="incomplete"
                                  className="text-sm hover:bg-accent/50"
                                >
                                  Incomplete
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </DropdownMenuContent>
                    </DropdownMenu>

                    {(activeFiltersCount > 0 || nameSearch !== "") && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setNameSearch("");
                          setSelectedStudentId("all");
                          setSelectedCourseId("all");
                          setSelectedSectionId("all");
                          setSelectedPeriodId("all");
                          setEnrollmentStatusFilter("all");
                        }}
                        className="h-10 px-3 text-sm text-muted-foreground hover:text-foreground"
                      >
                        Clear all
                      </Button>
                    )}
                    <Button
                      variant="default"
                      onClick={() => setIsCreateDialogOpen(true)}
                      className="h-10 px-4 font-medium shadow-sm"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Data Table Section - Integrated */}
        <div className="bg-card">
          <DataTable
            columns={columnsEnrollment}
            data={filteredEnrollments}
            onRowClick={handleRowClick}
            searchConfig={null}
            primaryAction={null}
            mobileColumns={{
              primaryColumn: "studentName",
              secondaryColumn: "status",
            }}
            emptyState={{
              title: "No enrollments found",
              description: (() => {
                const hasFilters =
                  nameSearch !== "" ||
                  selectedStudentId !== "all" ||
                  selectedCourseId !== "all" ||
                  selectedSectionId !== "all" ||
                  selectedPeriodId !== "all" ||
                  enrollmentStatusFilter !== "all";

                if (!hasFilters) {
                  return "No enrollments have been created yet. Create your first enrollment to get started.";
                }

                const activeFilters = [];
                if (nameSearch !== "") activeFilters.push(`"${nameSearch}"`);
                if (selectedStudentId !== "all") activeFilters.push(selectedStudentName);
                if (selectedCourseId !== "all") activeFilters.push(selectedCourseName);
                if (selectedSectionId !== "all") activeFilters.push(selectedSectionName);
                if (selectedPeriodId !== "all") activeFilters.push(selectedPeriodName);
                if (enrollmentStatusFilter !== "all") activeFilters.push(enrollmentStatusFilter);

                return `No enrollments match the selected filters: ${activeFilters.join(", ")}. Try adjusting your filters.`;
              })(),
            }}
            entityName="enrollments"
          />
        </div>
      </div>

      {/* Create Enrollment Dialog */}
      <EnrollmentFormDialog
        mode="create"
        open={isCreateDialogOpen}
        onOpenChange={handleCreateDialogClose}
      />

      {/* Edit Enrollment Dialog */}
      {selectedEnrollment && (
        <EnrollmentFormDialog
          mode="edit"
          enrollment={selectedEnrollment}
          open={isEditDialogOpen}
          onOpenChange={handleDialogClose}
        />
      )}
    </div>
  );
}