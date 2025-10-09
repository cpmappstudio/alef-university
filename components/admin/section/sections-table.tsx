"use client";

import * as React from "react";
import { columnsSections } from "../columns";
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
import { Section } from "../types";
import { SectionFormDialog } from "./sections-form-dialog";
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

type SectionAvailabilityFilter = "all" | "available" | "unavailable";
type SectionModalityFilter =
  | "all"
  | "online_sync"
  | "online_async"
  | "in_person"
  | "hybrid";
type SectionStatusFilter =
  | "all"
  | "draft"
  | "open"
  | "closed"
  | "active"
  | "grading"
  | "completed";

export default function SectionsTable() {
  const [nameSearch, setNameSearch] = React.useState("");
  const [selectedCourseId, setSelectedCourseId] = React.useState<
    Id<"courses"> | "all" | undefined
  >("all");
  const [courseSearchOpen, setCourseSearchOpen] = React.useState(false);
  const [courseSearchValue, setCourseSearchValue] = React.useState("");
  const [selectedPeriodId, setSelectedPeriodId] = React.useState<
    Id<"periods"> | "all" | undefined
  >("all");
  const [sectionModalityFilter, setSectionModalityFilter] =
    React.useState<SectionModalityFilter>("all");
  const [sectionAvailabilityFilter, setSectionAvailabilityFilter] =
    React.useState<SectionAvailabilityFilter>("all");
  const [sectionStatusFilter, setSectionStatusFilter] =
    React.useState<SectionStatusFilter>("all");
  const [selectedSection, setSelectedSection] = React.useState<
    Section | undefined
  >();
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = React.useState(false);

  const [periodSearchOpen, setPeriodSearchOpen] = React.useState(false);
  const [periodSearchValue, setPeriodSearchValue] = React.useState("");

  // Get all active courses for the filter dropdown
  const courses = useQuery(api.courses.getAllCourses, { isActive: true });
  const periods = useQuery(api.admin.getAllPeriods, {});


  // Get all sections using getSectionsByPeriod (supports course filtering)
  const allSectionsData = useQuery(api.admin.adminGetSections, {
    courseId: selectedCourseId === "all" ? undefined : selectedCourseId as Id<"courses">,
    periodId: selectedPeriodId === "all" ? undefined : selectedPeriodId as Id<"periods">,
    deliveryMethod: sectionModalityFilter === "all" ? undefined : sectionModalityFilter,
    status: sectionStatusFilter === "all" ? undefined : sectionStatusFilter,
    isActive: sectionAvailabilityFilter === "all"
      ? undefined
      : sectionAvailabilityFilter === "available",
  });

  // 3. Simplify the filteredSections logic to only handle text search
  const filteredSections = React.useMemo(() => {
    if (!allSectionsData) return [];

    // If no text search, return all sections
    if (!nameSearch) return allSectionsData;

    // Apply text search filter
    return allSectionsData.filter((section) => {
      const searchLower = nameSearch.toLowerCase();
      return (
        section.courseName?.toLowerCase().includes(searchLower) ||
        section.courseCode?.toLowerCase().includes(searchLower) ||
        section.groupNumber?.toString().toLowerCase().includes(searchLower)
      );
    });
  }, [allSectionsData, nameSearch]);

  const handleRowClick = (section: Section) => {
    setSelectedSection(section);
    setIsEditDialogOpen(true);
  };

  const handleCreateSection = () => {
    setIsCreateDialogOpen(true);
  };

  const handleDialogClose = () => {
    setIsEditDialogOpen(false);
    setIsCreateDialogOpen(false);
    setSelectedSection(undefined);
  };

  // Count active filters (all filters in DropdownMenu)
  const activeFiltersCount = React.useMemo(() => {
    let count = 0;
    if (selectedCourseId !== "all") count++;
    if (selectedPeriodId !== "all") count++;
    if (sectionModalityFilter !== "all") count++;
    if (sectionAvailabilityFilter !== "all") count++;
    if (sectionStatusFilter !== "all") count++;
    return count;
  }, [
    selectedCourseId,
    selectedPeriodId,
    sectionModalityFilter,
    sectionAvailabilityFilter,
    sectionStatusFilter,
  ]);

  // Get selected course name for display
  const selectedCourseName = React.useMemo(() => {
    if (selectedCourseId === "all") return "All Courses";
    const course = courses?.find((c) => c._id === selectedCourseId);
    return course ? `${course.code} - ${course.nameEs}` : "All Courses";
  }, [selectedCourseId, courses]);

  // Show loading state when essential data is still being fetched
  if (courses === undefined || periods === undefined) {
    return (
      <div className="flex items-center justify-center min-h-[400px] bg-card rounded-xl border border-border/50 shadow-sm">
        <div className="flex flex-col items-center space-y-4 p-8">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-muted-foreground font-medium">
            Loading filter options...
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
            {/* Filters Section */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              {/* Name Search */}
              <div className="flex-1 w-full sm:w-auto">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search sections by group name..."
                    value={nameSearch}
                    onChange={(e) => setNameSearch(e.target.value)}
                    className="pl-10 h-10 bg-background border-border/50 shadow-sm transition-colors focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              {/* Filters Dropdown */}
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
                          <PopoverContent className="w-full p-0" align="start">
                            <Command>
                              <CommandInput
                                placeholder="Search courses..."
                                value={courseSearchValue}
                                onValueChange={setCourseSearchValue}
                              />
                              <CommandList>
                                <CommandEmpty>No courses found.</CommandEmpty>
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
                                    ?.sort((a, b) =>
                                      a.code.localeCompare(b.code),
                                    )
                                    .filter((course) => {
                                      if (!courseSearchValue) {
                                        const firstThreeCourses = courses.slice(
                                          0,
                                          3,
                                        );
                                        return firstThreeCourses.includes(
                                          course,
                                        );
                                      }
                                      const searchLower =
                                        courseSearchValue.toLowerCase();
                                      return (
                                        course.code
                                          .toLowerCase()
                                          .includes(searchLower) ||
                                        course.nameEs
                                          .toLowerCase()
                                          .includes(searchLower) ||
                                        course.nameEn
                                          ?.toLowerCase()
                                          .includes(searchLower)
                                      );
                                    })
                                    .map((course) => (
                                      <CommandItem
                                        key={course._id}
                                        value={`${course.code} ${course.nameEs}`}
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

                      {/* Availability Filter */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">
                          Availability
                        </label>
                        <Select
                          value={sectionAvailabilityFilter}
                          onValueChange={(value) =>
                            setSectionAvailabilityFilter(
                              value as SectionAvailabilityFilter,
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
                                {selectedPeriodId === "all"
                                  ? "All Periods"
                                  : periods?.find(p => p._id === selectedPeriodId)
                                    ? `${periods.find(p => p._id === selectedPeriodId)?.code} - ${periods.find(p => p._id === selectedPeriodId)?.nameEs}`
                                    : "All Periods"}
                              </span>
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-full p-0" align="start">
                            <Command>
                              <CommandInput
                                placeholder="Search periods..."
                                value={periodSearchValue}
                                onValueChange={setPeriodSearchValue}
                              />
                              <CommandList>
                                <CommandEmpty>No periods found.</CommandEmpty>
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
                                    ?.sort((a, b) => b.year - a.year || a.code.localeCompare(b.code))
                                    .filter((period) => {
                                      if (!periodSearchValue) return true;
                                      const searchLower = periodSearchValue.toLowerCase();
                                      return (
                                        period.code.toLowerCase().includes(searchLower) ||
                                        period.nameEs.toLowerCase().includes(searchLower) ||
                                        period.nameEn?.toLowerCase().includes(searchLower) ||
                                        period.year.toString().includes(searchLower)
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
                                        {period.code} - {period.nameEs} ({period.year})
                                      </CommandItem>
                                    ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      </div>

                      {/* Modality Filter */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">
                          Modality
                        </label>
                        <Select
                          value={sectionModalityFilter}
                          onValueChange={(value) =>
                            setSectionModalityFilter(
                              value as SectionModalityFilter,
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
                              value="online_sync"
                              className="text-sm hover:bg-accent/50"
                            >
                              Online Sync
                            </SelectItem>
                            <SelectItem
                              value="online_async"
                              className="text-sm hover:bg-accent/50"
                            >
                              Online Asyn
                            </SelectItem>
                            <SelectItem
                              value="in_person"
                              className="text-sm hover:bg-accent/50"
                            >
                              In Person
                            </SelectItem>
                            <SelectItem
                              value="hybrid"
                              className="text-sm hover:bg-accent/50"
                            >
                              Hybrid
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Status Filter */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">
                          Status
                        </label>
                        <Select
                          value={sectionStatusFilter}
                          onValueChange={(value) =>
                            setSectionStatusFilter(value as SectionStatusFilter)
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
                              value="draft"
                              className="text-sm hover:bg-accent/50"
                            >
                              Draft
                            </SelectItem>
                            <SelectItem
                              value="open"
                              className="text-sm hover:bg-accent/50"
                            >
                              Open
                            </SelectItem>
                            <SelectItem
                              value="closed"
                              className="text-sm hover:bg-accent/50"
                            >
                              Closed
                            </SelectItem>
                            <SelectItem
                              value="active"
                              className="text-sm hover:bg-accent/50"
                            >
                              Active
                            </SelectItem>
                            <SelectItem
                              value="grading"
                              className="text-sm hover:bg-accent/50"
                            >
                              Grading
                            </SelectItem>
                            <SelectItem
                              value="completed"
                              className="text-sm hover:bg-accent/50"
                            >
                              Completed
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
                      setSelectedCourseId("all");
                      setSectionModalityFilter("all");
                      setSectionAvailabilityFilter("all");
                      setSectionStatusFilter("all");
                      //setSectionPeriodFilter("all");
                    }}
                    className="h-10 px-3 text-sm text-muted-foreground hover:text-foreground"
                  >
                    Clear all
                  </Button>
                )}
                <Button
                  onClick={handleCreateSection}
                  className="bg-deep-koamaru hover:bg-deep-koamaru/90 text-white shadow-md hover:shadow-lg transition-all duration-200 sm:w-auto w-full"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Data Table Section - Integrated */}
        <div className="bg-card overflow-x-auto">
          <div className="min-w-full">
            {allSectionsData === undefined ? (
              // Show loading when sections are being fetched
              <div className="flex items-center justify-center min-h-[400px]">
                <div className="flex flex-col items-center space-y-4">
                  <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-muted-foreground font-medium">
                    Loading sections...
                  </p>
                </div>
              </div>
            ) : (
              // Show data table when sections are loaded
              <DataTable
                columns={columnsSections}
                data={filteredSections}
                onRowClick={handleRowClick}
                searchConfig={null}
                primaryAction={null}
                mobileColumns={{
                  primaryColumn: "groupNumber",
                  secondaryColumn: "isActive",
                }}
                emptyState={{
                  title: "No sections found",
                  description:
                    "No sections found. Try adjusting your filters or create a new section.",
                }}
                entityName="sections"
              />
            )}
          </div>
        </div>
      </div>

      {/* Create Section Dialog */}
      <SectionFormDialog
        mode="create"
        open={isCreateDialogOpen}
        onOpenChange={handleDialogClose}
      />

      {/* Edit Section Dialog */}
      {selectedSection && (
        <SectionFormDialog
          mode="edit"
          section={selectedSection}
          open={isEditDialogOpen}
          onOpenChange={handleDialogClose}
        />
      )}
    </div>
  );
}
