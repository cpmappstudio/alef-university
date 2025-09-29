"use client";

import * as React from "react";
import { columnsCourses } from "../columns";
import { DataTable } from "../../ui/data-table";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
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
import { Course } from "../types";
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
import { CourseFormDialog } from "./course-form-dialog";

type CourseStatusFilter = "all" | "available" | "unavailable";
type CourseLevelFilter =
  | "all"
  | "introductory"
  | "intermediate"
  | "advanced"
  | "graduate";
type CourseCategoryFilter =
  | "all"
  | "humanities"
  | "core"
  | "elective"
  | "general";
type CourseLanguageFilter = "all" | "es" | "en" | "both";

export default function CourseTable() {
  const [nameSearch, setNameSearch] = React.useState("");
  const [selectedProgramId, setSelectedProgramId] = React.useState<
    Id<"programs"> | "all" | undefined
  >("all");
  const [programSearchOpen, setProgramSearchOpen] = React.useState(false);
  const [programSearchValue, setProgramSearchValue] = React.useState("");
  const [courseStatusFilter, setCourseStatusFilter] =
    React.useState<CourseStatusFilter>("all");
  const [courseLevelFilter, setCourseLevelFilter] =
    React.useState<CourseLevelFilter>("all");
  const [courseCategoryFilter, setCourseCategoryFilter] =
    React.useState<CourseCategoryFilter>("all");
  const [courseLanguageFilter, setCourseLanguageFilter] =
    React.useState<CourseLanguageFilter>("all");
  const [selectedCourse, setSelectedCourse] = React.useState<
    Course | undefined
  >();
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);

  // Get all programs for the filter dropdown
  const programs = useQuery(api.programs.getAllPrograms, { isActive: true });

  // Get all courses (load all by default, filter by program if selected)
  const allCourses = useQuery(
    api.courses.getAllCourses,
    selectedProgramId && selectedProgramId !== "all"
      ? {
          programId: selectedProgramId as Id<"programs">,
          // Remove isActive filter to get all courses
        }
      : {
          // Load all courses when no specific program is selected
        },
  );

  // Filter courses based on all active filters
  const filteredCourses = React.useMemo(() => {
    if (!allCourses) return [];

    return allCourses.filter((course) => {
      // Name search filter
      const nameMatch =
        nameSearch === "" ||
        course.nameEs?.toLowerCase().includes(nameSearch.toLowerCase()) ||
        course.nameEn?.toLowerCase().includes(nameSearch.toLowerCase()) ||
        course.code?.toLowerCase().includes(nameSearch.toLowerCase());

      // Status filter
      const statusMatch =
        courseStatusFilter === "all" ||
        (courseStatusFilter === "available" && course.isActive) ||
        (courseStatusFilter === "unavailable" && !course.isActive);

      // Level filter
      const levelMatch =
        courseLevelFilter === "all" || course.level === courseLevelFilter;

      // Category filter
      const categoryMatch =
        courseCategoryFilter === "all" ||
        course.category === courseCategoryFilter;

      // Language filter
      const languageMatch =
        courseLanguageFilter === "all" ||
        course.language === courseLanguageFilter;

      return (
        nameMatch && statusMatch && levelMatch && categoryMatch && languageMatch
      );
    });
  }, [
    allCourses,
    nameSearch,
    courseStatusFilter,
    courseLevelFilter,
    courseCategoryFilter,
    courseLanguageFilter,
  ]);

  const handleRowClick = (course: Course) => {
    setSelectedCourse(course);
    setIsEditDialogOpen(true);
  };

  const handleDialogClose = () => {
    setIsEditDialogOpen(false);
    setSelectedCourse(undefined);
  };

  // Count active filters (all filters in DropdownMenu)
  const activeFiltersCount = React.useMemo(() => {
    let count = 0;
    if (selectedProgramId !== "all") count++;
    if (courseStatusFilter !== "all") count++;
    if (courseLevelFilter !== "all") count++;
    if (courseCategoryFilter !== "all") count++;
    if (courseLanguageFilter !== "all") count++;
    return count;
  }, [
    selectedProgramId,
    courseStatusFilter,
    courseLevelFilter,
    courseCategoryFilter,
    courseLanguageFilter,
  ]);

  // Get selected program name for display
  const selectedProgramName = React.useMemo(() => {
    if (selectedProgramId === "all") return "All Programs";
    const program = programs?.find((p) => p._id === selectedProgramId);
    return program ? `${program.code} - ${program.nameEs}` : "All Programs";
  }, [selectedProgramId, programs]);

  // Show loading only when programs are loading
  if (programs === undefined) {
    return (
      <div className="flex items-center justify-center min-h-[400px] bg-card rounded-xl border border-border/50 shadow-sm">
        <div className="flex flex-col items-center space-y-4 p-8">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-muted-foreground font-medium">
            Loading courses...
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
                        placeholder="Search courses by name, code..."
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
                                        All
                                      </CommandItem>
                                      {programs
                                        ?.sort((a, b) =>
                                          a.code.localeCompare(b.code),
                                        )
                                        .filter((program) => {
                                          if (!programSearchValue) {
                                            const firstThreePrograms =
                                              programs.slice(0, 3);
                                            return firstThreePrograms.includes(
                                              program,
                                            );
                                          }
                                          const searchLower =
                                            programSearchValue.toLowerCase();
                                          return (
                                            program.code
                                              .toLowerCase()
                                              .includes(searchLower) ||
                                            program.nameEs
                                              .toLowerCase()
                                              .includes(searchLower) ||
                                            program.nameEn
                                              ?.toLowerCase()
                                              .includes(searchLower)
                                          );
                                        })
                                        .map((program) => (
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
                                                selectedProgramId ===
                                                program._id
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

                          {/* Availability Filter */}
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">
                              Availability
                            </label>
                            <Select
                              value={courseStatusFilter}
                              onValueChange={(value) =>
                                setCourseStatusFilter(
                                  value as CourseStatusFilter,
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
                                  value="available"
                                  className="text-sm hover:bg-accent/50"
                                >
                                  Available
                                </SelectItem>
                                <SelectItem
                                  value="unavailable"
                                  className="text-sm hover:bg-accent/50"
                                >
                                  Unavailable
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Level Filter */}
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">
                              Level
                            </label>
                            <Select
                              value={courseLevelFilter}
                              onValueChange={(value) =>
                                setCourseLevelFilter(value as CourseLevelFilter)
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
                                  value="introductory"
                                  className="text-sm hover:bg-accent/50"
                                >
                                  Introductory
                                </SelectItem>
                                <SelectItem
                                  value="intermediate"
                                  className="text-sm hover:bg-accent/50"
                                >
                                  Intermediate
                                </SelectItem>
                                <SelectItem
                                  value="advanced"
                                  className="text-sm hover:bg-accent/50"
                                >
                                  Advanced
                                </SelectItem>
                                <SelectItem
                                  value="graduate"
                                  className="text-sm hover:bg-accent/50"
                                >
                                  Graduate
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Category Filter */}
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">
                              Category
                            </label>
                            <Select
                              value={courseCategoryFilter}
                              onValueChange={(value) =>
                                setCourseCategoryFilter(
                                  value as CourseCategoryFilter,
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
                                  value="humanities"
                                  className="text-sm hover:bg-accent/50"
                                >
                                  Humanities
                                </SelectItem>
                                <SelectItem
                                  value="core"
                                  className="text-sm hover:bg-accent/50"
                                >
                                  Core
                                </SelectItem>
                                <SelectItem
                                  value="elective"
                                  className="text-sm hover:bg-accent/50"
                                >
                                  Elective
                                </SelectItem>
                                <SelectItem
                                  value="general"
                                  className="text-sm hover:bg-accent/50"
                                >
                                  General
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Language Filter */}
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">
                              Language
                            </label>
                            <Select
                              value={courseLanguageFilter}
                              onValueChange={(value) =>
                                setCourseLanguageFilter(
                                  value as CourseLanguageFilter,
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
                                  value="en"
                                  className="text-sm hover:bg-accent/50"
                                >
                                  English
                                </SelectItem>
                                <SelectItem
                                  value="es"
                                  className="text-sm hover:bg-accent/50"
                                >
                                  Spanish
                                </SelectItem>
                                <SelectItem
                                  value="both"
                                  className="text-sm hover:bg-accent/50"
                                >
                                  English/Spanish
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
                          setSelectedProgramId("all");
                          setCourseStatusFilter("all");
                          setCourseLevelFilter("all");
                          setCourseCategoryFilter("all");
                          setCourseLanguageFilter("all");
                        }}
                        className="h-10 px-3 text-sm text-muted-foreground hover:text-foreground"
                      >
                        Clear all
                      </Button>
                    )}
                    <Button
                      variant="default"
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
          {allCourses === undefined ? (
            // Show loading when courses are being fetched
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="flex flex-col items-center space-y-4">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                <p className="text-muted-foreground font-medium">
                  Loading courses...
                </p>
              </div>
            </div>
          ) : (
            // Show data table when courses are loaded
            <DataTable
              columns={columnsCourses}
              data={filteredCourses}
              onRowClick={handleRowClick}
              searchConfig={null}
              primaryAction={null}
              mobileColumns={{
                primaryColumn: "nameEs",
                secondaryColumn: "isActive",
              }}
              emptyState={{
                title: "No courses found",
                description: (() => {
                  const hasFilters =
                    nameSearch !== "" ||
                    selectedProgramId !== "all" ||
                    courseStatusFilter !== "all" ||
                    courseLevelFilter !== "all" ||
                    courseCategoryFilter !== "all" ||
                    courseLanguageFilter !== "all";

                  if (!hasFilters) {
                    return "No courses have been created yet. Create your first course to get started.";
                  }

                  const activeFilters = [];
                  if (nameSearch !== "") activeFilters.push(`"${nameSearch}"`);
                  if (selectedProgramId !== "all") {
                    const programName = programs?.find(
                      (p) => p._id === selectedProgramId,
                    );
                    activeFilters.push(
                      programName ? `${programName.code}` : "Selected program",
                    );
                  }
                  if (courseStatusFilter !== "all")
                    activeFilters.push(courseStatusFilter);
                  if (courseLevelFilter !== "all")
                    activeFilters.push(courseLevelFilter);
                  if (courseCategoryFilter !== "all")
                    activeFilters.push(courseCategoryFilter);
                  if (courseLanguageFilter !== "all") {
                    const languageLabel =
                      courseLanguageFilter === "en"
                        ? "English"
                        : courseLanguageFilter === "es"
                          ? "Spanish"
                          : "Both languages";
                    activeFilters.push(languageLabel);
                  }

                  return `No courses match the selected filters: ${activeFilters.join(", ")}. Try adjusting your filters.`;
                })(),
              }}
              entityName="courses"
            />
          )}
        </div>
      </div>

      {/* Edit Course Dialog */}
      {selectedCourse && (
        <CourseFormDialog
          course={selectedCourse}
          open={isEditDialogOpen}
          onOpenChange={handleDialogClose}
        />
      )}
    </div>
  );
}
