"use client";

import * as React from "react";
import { columnsCourses } from "./columns";
import { DataTable } from "../../ui/data-table";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { MousePointerClick, Plus } from "lucide-react";
import { Course } from "./types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Id } from "@/convex/_generated/dataModel";
import { CourseFormDialog } from "./course-form-dialog";

type CourseStatusFilter = "all" | "available" | "unavailable";

export default function CourseTable() {
  const [selectedProgramId, setSelectedProgramId] = React.useState<
    Id<"programs"> | undefined
  >();
  const [courseStatusFilter, setCourseStatusFilter] = React.useState<CourseStatusFilter>("all");
  const [selectedCourse, setSelectedCourse] = React.useState<
    Course | undefined
  >();
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);

  // Get all programs for the filter dropdown
  const programs = useQuery(api.programs.getAllPrograms, { isActive: true });

  // Get all courses for the selected program (both active and inactive)
  // Only fetch courses when a program is selected
  const allCourses = useQuery(
    api.courses.getAllCourses,
    selectedProgramId
      ? {
          programId: selectedProgramId,
          // Remove isActive filter to get all courses
        }
      : "skip"
  );

  // Filter courses based on status filter
  const filteredCourses = React.useMemo(() => {
    if (!allCourses) return [];
    
    switch (courseStatusFilter) {
      case "available":
        return allCourses.filter(course => course.isActive);
      case "unavailable":
        return allCourses.filter(course => !course.isActive);
      case "all":
      default:
        return allCourses;
    }
  }, [allCourses, courseStatusFilter]);

  const handleRowClick = (course: Course) => {
    setSelectedCourse(course);
    setIsEditDialogOpen(true);
  };

   const handleDialogClose = () => {
    setIsEditDialogOpen(false);
    setSelectedCourse(undefined);
  };

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
            {/* Section Title */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="space-y-1">
                <h2 className="text-xl sm:text-2xl font-semibold text-foreground">
                  Course Management
                </h2>
                <p className="text-sm text-muted-foreground">
                  View and manage courses by academic program
                </p>
              </div>
            </div>

            {/* Filter Section */}
            <div className="flex flex-col gap-4 pt-2">
              {/* Filter Controls */}
              <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
                {/* Program Filter (Required) */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full md:w-auto">
                  <label
                    htmlFor="program-filter"
                    className="text-sm font-medium text-foreground whitespace-nowrap"
                  >
                    Program <span className="text-destructive">*</span>:
                  </label>
                  <Select
                    value={selectedProgramId || ""}
                    onValueChange={(value) =>
                      setSelectedProgramId(value as Id<"programs">)
                    }
                  >
                    <SelectTrigger className="w-full sm:w-[280px] md:w-[240px] lg:w-[280px] h-9 bg-background border-border/50 shadow-sm transition-colors hover:bg-accent/50">
                      <SelectValue placeholder="Select a program (required)" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border/50 shadow-lg max-h-[200px] overflow-y-auto">
                      {programs
                        .sort((a, b) => a.code.localeCompare(b.code))
                        .map((program) => (
                          <SelectItem key={program._id} value={program._id} className="text-sm hover:bg-accent/50">
                            {program.code} - {program.nameEs}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Course Status Filter (Optional) */}
                {selectedProgramId && (
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full md:w-auto">
                    <label
                      htmlFor="status-filter"
                      className="text-sm font-medium text-foreground whitespace-nowrap"
                    >
                      Filter by Availability:
                    </label>
                    <Select
                      value={courseStatusFilter}
                      onValueChange={(value) =>
                        setCourseStatusFilter(value as CourseStatusFilter)
                      }
                    >
                      <SelectTrigger className="w-full sm:w-[160px] md:w-[140px] lg:w-[160px] h-9 bg-background border-border/50 shadow-sm transition-colors hover:bg-accent/50">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border-border/50 shadow-lg">
                        <SelectItem value="all" className="text-sm hover:bg-accent/50">All Courses</SelectItem>
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
            {!selectedProgramId ? (
          // Show message when no program is selected
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="flex flex-col items-center space-y-4 text-center">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center">
                <MousePointerClick className="w-8 h-8 text-muted-foreground" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-foreground">
                  Select a Program
                </h3>
                <p className="text-muted-foreground max-w-md">
                  Please select a program from the dropdown above to view its associated courses.
                </p>
              </div>
            </div>
          </div>
        ) : allCourses === undefined ? (
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
              // Show data table when program is selected and courses are loaded
              <DataTable
                columns={columnsCourses}
                data={filteredCourses}
                onRowClick={handleRowClick}
                searchConfig={{
                  placeholder: "Search courses by name...",
                  columnKey: "nameEs",
                }}
                primaryAction={null}
                mobileColumns={{
                  primaryColumn: "nameEs",
                  secondaryColumn: "isActive",
                }}
                emptyState={{
                  title: `No ${courseStatusFilter === "all" ? "" : courseStatusFilter} courses found`,
                  description:
                    courseStatusFilter === "all"
                      ? "This program has no courses yet."
                      : courseStatusFilter === "available"
                      ? "This program has no available courses."
                      : "This program has no unavailable courses.",
                }}
                entityName="courses"
              />
            )}
          </div>
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
