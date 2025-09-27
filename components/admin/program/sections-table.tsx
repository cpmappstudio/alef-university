"use client";

import * as React from "react";
import { columnsSections } from "./columns";
import { DataTable } from "../../ui/data-table";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { MousePointerClick, Plus } from "lucide-react";
import { Section } from "./types";
import { SectionFormDialog } from "./sections-form-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Id } from "@/convex/_generated/dataModel";

type SectionStatusFilter = "all" | "available" | "unavailable";

export default function SectionsTable() {
  const [selectedCourseId, setSelectedCourseId] = React.useState<
    Id<"courses"> | undefined
  >();
  const [sectionStatusFilter, setSectionStatusFilter] =
    React.useState<SectionStatusFilter>("all");
  const [selectedSection, setSelectedSection] = React.useState<
    Section | undefined
  >();
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = React.useState(false);


  // Get all active courses for the filter dropdown
  const courses = useQuery(api.courses.getAllCourses, { isActive: true });

  // Get all sections for the selected course (both active and inactive)
  // Only fetch sections when a course is selected
  const courseWithSections = useQuery(
    api.courses.getCourseWithSections,
    selectedCourseId ? { courseId: selectedCourseId } : "skip",
  );

  // Extract all sections from the course data (without isActive filter)
  const allSections = React.useMemo(() => {
    if (!courseWithSections?.sections) return [];
    // Get all sections and extract the section data
    return courseWithSections.sections.map((sectionDetail) => ({
      ...sectionDetail.section,
      // Add professor info and enrollment stats for display
      professorName: sectionDetail.professor
        ? `${sectionDetail.professor.firstName} ${sectionDetail.professor.lastName}`
        : "TBD",
      enrollmentStats: sectionDetail.enrollmentStats,
    }));
  }, [courseWithSections]);

  // Filter sections based on status filter
  const filteredSections = React.useMemo(() => {
    if (!allSections) return [];

    switch (sectionStatusFilter) {
      case "available":
        return allSections.filter((section) => section.isActive);
      case "unavailable":
        return allSections.filter((section) => !section.isActive);
      case "all":
      default:
        return allSections;
    }
  }, [allSections, sectionStatusFilter]);

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

  if (courses === undefined) {
    return (
      <div className="flex items-center justify-center min-h-[400px] bg-card rounded-xl border border-border/50 shadow-sm">
        <div className="flex flex-col items-center space-y-4 p-8">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-muted-foreground font-medium">
            Loading sections...
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
            {/* Section Title */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="space-y-1">
                <h2 className="text-xl sm:text-2xl font-semibold text-foreground">
                  Section Management
                </h2>
                <p className="text-sm text-muted-foreground">
                  View and manage course sections by selecting a course
                </p>
              </div>
              <Button
                onClick={handleCreateSection}
                disabled={!selectedCourseId}
                className="bg-deep-koamaru hover:bg-deep-koamaru/90 text-white shadow-md hover:shadow-lg transition-all duration-200 sm:w-auto w-full"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Section
              </Button>
            </div>

            {/* Filter Section */}
            <div className="flex flex-col gap-4 pt-2">
              {/* Filter Controls */}
              <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
          {/* Course Filter (Required) */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full md:w-auto">
            <label
              htmlFor="course-filter"
              className="text-sm font-medium text-foreground whitespace-nowrap"
            >
              Course <span className="text-destructive">*</span>:
            </label>
            <Select
              value={selectedCourseId || ""}
              onValueChange={(value) =>
                setSelectedCourseId(value as Id<"courses">)
              }
            >
              <SelectTrigger className="w-full sm:w-[350px] md:w-[280px] lg:w-[350px] h-9 bg-background border-border/50 shadow-sm transition-colors hover:bg-accent/50">
                <SelectValue placeholder="Select a course (required)" />
              </SelectTrigger>
              <SelectContent className="max-h-[200px] overflow-y-auto bg-popover border-border/50 shadow-lg">
                {courses
                  .sort((a, b) => a.code.localeCompare(b.code))
                  .map((course) => (
                    <SelectItem key={course._id} value={course._id} className="text-sm hover:bg-accent/50">
                      {course.code} - {course.nameEs}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          {/* Section Status Filter (Optional) */}
          {selectedCourseId && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full md:w-auto">
              <label
                htmlFor="status-filter"
                className="text-sm font-medium text-foreground whitespace-nowrap"
              >
                Filter by Availability:
              </label>
              <Select
                value={sectionStatusFilter}
                onValueChange={(value) =>
                  setSectionStatusFilter(value as SectionStatusFilter)
                }
              >
                <SelectTrigger className="w-full sm:w-[180px] md:w-[160px] lg:w-[180px] h-9 bg-background border-border/50 shadow-sm transition-colors hover:bg-accent/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border/50 shadow-lg">
                  <SelectItem value="all" className="text-sm hover:bg-accent/50">All Sections</SelectItem>
                  <SelectItem value="available" className="text-sm hover:bg-accent/50">Available</SelectItem>
                  <SelectItem value="unavailable" className="text-sm hover:bg-accent/50">Unavailable</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
              </div>
            </div>
          </div>
        </div>

        {/* Data Table Section - Integrated */}
        <div className="bg-card overflow-x-auto">
          <div className="min-w-full">
            {!selectedCourseId ? (
          // Show message when no course is selected
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="flex flex-col items-center space-y-4 text-center">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center">
                <MousePointerClick className="w-8 h-8 text-muted-foreground" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-foreground">
                  Select a Course
                </h3>
                <p className="text-muted-foreground max-w-md">
                  Please select a course from the dropdown above to view
                  its associated sections.
                </p>
              </div>
            </div>
          </div>
        ) : courseWithSections === undefined ? (
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
              // Show data table when course is selected and sections are loaded
              <DataTable
                columns={columnsSections}
                data={filteredSections}
                onRowClick={handleRowClick}
                searchConfig={{
                  placeholder: "Search sections by group ...",
                  columnKey: "groupNumber",
                }}
                primaryAction={null}
                mobileColumns={{
                  primaryColumn: "groupNumber",
                  secondaryColumn: "isActive",
                }}
                emptyState={{
                  title: `No ${sectionStatusFilter === "all" ? "" : sectionStatusFilter} sections found`,
                  description:
                    sectionStatusFilter === "all"
                      ? "This course has no sections yet. Try creating a new section."
                      : sectionStatusFilter === "available"
                        ? "This course has no available sections."
                        : "This course has no unavailable sections.",
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
