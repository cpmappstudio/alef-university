"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useAuth } from "@clerk/nextjs";
import { createColumnsTeachingHistory } from "./columns";
import { DataTable } from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Download,
  Filter,
  ChevronDown,
  Users,
  BookOpen,
  Calendar,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  TeachingHistorySection,
  PeriodTeachingSummary,
} from "../../lib/professors/types";
import { SectionDetailsDialog } from "./section-details-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

type StatusFilter = "all" | "active" | "closed" | "cancelled";
type CategoryFilter = "all" | "humanities" | "core" | "elective" | "general";

export default function TeachingHistoryTable() {
  const t = useTranslations("gradebook");
  const { isSignedIn } = useAuth();

  // Only execute query when user is signed in
  const teachingHistory = useQuery(
    api.professors.getMyTeachingHistory,
    isSignedIn ? {} : "skip",
  );

  // Create columns with translations
  const columns = React.useMemo(
    () =>
      createColumnsTeachingHistory({
        table: {
          code: t("table.code"),
          group: t("table.group"),
          courseName: t("table.courseName"),
          credits: t("table.credits"),
          category: t("table.category"),
          closingDate: t("table.closingDate"),
          students: t("table.students"),
          status: t("table.status"),
        },
        categories: {
          core: t("categories.core"),
          humanities: t("categories.humanities"),
          electives: t("categories.electives"),
        },
        status: {
          active: t("status.active"),
          closed: t("status.closed"),
          cancelled: t("status.cancelled"),
        },
      }),
    [t],
  );

  const [searchTerm, setSearchTerm] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>("all");
  const [categoryFilter, setCategoryFilter] =
    React.useState<CategoryFilter>("all");
  const [selectedSection, setSelectedSection] =
    React.useState<TeachingHistorySection | null>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = React.useState(false);
  const [currentPeriodIndex, setCurrentPeriodIndex] = React.useState(0); // 0 = most recent period

  const periodSummaries = React.useMemo<PeriodTeachingSummary[]>(() => {
    // Check if teachingHistory is an empty array (no auth) or doesn't have history property
    if (!teachingHistory || Array.isArray(teachingHistory)) return [];
    if (
      !("history" in teachingHistory) ||
      !Array.isArray(teachingHistory.history)
    )
      return [];

    return teachingHistory.history.map((periodData: any) => {
      const sections: TeachingHistorySection[] = periodData.sections.map(
        (s: any) => ({
          _id: s.section._id,
          courseCode: s.course.code,
          courseName: s.course.nameEs,
          groupNumber: s.section.groupNumber,
          credits: s.course.credits,
          category: s.course.category,
          closingDate: periodData.period.endDate,
          status: s.section.status,
          enrolledStudents: s.statistics.enrolled,
          completedStudents: s.statistics.completed,
          course: s.course,
          section: s.section,
          period: periodData.period,
        }),
      );

      return {
        period: periodData.period,
        sections,
        totalStudents: sections.reduce(
          (sum, s) => sum + (s.enrolledStudents + s.completedStudents),
          0,
        ),
        totalCourses: sections.length,
      };
    });
  }, [teachingHistory]);

  // Get all periods sorted by most recent first
  const allPeriodsSorted = React.useMemo(() => {
    if (!periodSummaries) return [];
    return [...periodSummaries].reverse(); // Most recent first
  }, [periodSummaries]);

  // Get the current period to display based on index
  const currentPeriod = React.useMemo(() => {
    if (!allPeriodsSorted || allPeriodsSorted.length === 0) return null;
    return allPeriodsSorted[currentPeriodIndex] || null;
  }, [allPeriodsSorted, currentPeriodIndex]);

  // Search across all periods and auto-switch to the period with results
  React.useEffect(() => {
    if (searchTerm === "") return;

    // Search for a matching section across all periods
    for (let i = 0; i < allPeriodsSorted.length; i++) {
      const period = allPeriodsSorted[i];
      const hasMatch = period.sections.some((section) => {
        const matchesSearch =
          section.courseName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          section.courseCode.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus =
          statusFilter === "all" || section.status === statusFilter;
        const matchesCategory =
          categoryFilter === "all" || section.category === categoryFilter;

        return matchesSearch && matchesStatus && matchesCategory;
      });

      if (hasMatch && currentPeriodIndex !== i) {
        setCurrentPeriodIndex(i);
        break;
      }
    }
  }, [
    searchTerm,
    statusFilter,
    categoryFilter,
    allPeriodsSorted,
    currentPeriodIndex,
  ]);

  // Filter sections in the current period
  const filteredCurrentPeriod = React.useMemo(() => {
    if (!currentPeriod) return null;

    // Filter sections within the period
    const filteredSections = currentPeriod.sections.filter((section) => {
      // Search filter
      const searchMatch =
        searchTerm === "" ||
        section.courseName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        section.courseCode.toLowerCase().includes(searchTerm.toLowerCase());

      // Status filter
      const statusMatch =
        statusFilter === "all" || section.status === statusFilter;

      // Category filter
      const catMatch =
        categoryFilter === "all" || section.category === categoryFilter;

      return searchMatch && statusMatch && catMatch;
    });

    // Return a new object with filtered sections
    return {
      ...currentPeriod,
      sections: filteredSections,
    };
  }, [currentPeriod, searchTerm, statusFilter, categoryFilter]);

  // Count active filters
  const activeFiltersCount = React.useMemo(() => {
    let count = 0;
    if (statusFilter !== "all") count++;
    if (categoryFilter !== "all") count++;
    return count;
  }, [statusFilter, categoryFilter]);

  // Navigation handlers
  const goToNextPeriod = () => {
    if (currentPeriodIndex < allPeriodsSorted.length - 1) {
      setCurrentPeriodIndex(currentPeriodIndex + 1);
    }
  };

  const goToPreviousPeriod = () => {
    if (currentPeriodIndex > 0) {
      setCurrentPeriodIndex(currentPeriodIndex - 1);
    }
  };

  const handleRowClick = (section: TeachingHistorySection) => {
    setSelectedSection(section);
    setIsDetailsDialogOpen(true);
  };

  if (teachingHistory === undefined) {
    return (
      <div className="flex items-center justify-center min-h-[400px] bg-card rounded-xl border border-border/50 shadow-sm">
        <div className="flex flex-col items-center space-y-4 p-8">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-muted-foreground font-medium">{t("title")}...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("stats.totalStudents")}
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {teachingHistory &&
              !Array.isArray(teachingHistory) &&
              "summary" in teachingHistory
                ? teachingHistory.summary.totalStudentsTaught
                : 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {t("stats.acrossAllPeriods")}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("stats.totalCourses")}
            </CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {teachingHistory &&
              !Array.isArray(teachingHistory) &&
              "summary" in teachingHistory
                ? teachingHistory.summary.totalCoursesDelivered
                : 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {t("stats.coursesDelivered")}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("stats.totalPeriods")}
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {teachingHistory &&
              !Array.isArray(teachingHistory) &&
              "summary" in teachingHistory
                ? teachingHistory.summary.totalPeriods
                : 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {t("stats.periodsTaught")}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters Container */}
      <div className="bg-card rounded-xl border border-border/50 shadow-sm overflow-hidden mx-1 sm:mx-0">
        <div className="p-3 sm:p-4 lg:p-6 border-b border-border/30 bg-card">
          <div className="space-y-4">
            {/* Filters Row */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              {/* Search Input */}
              <div className="flex-1 w-full sm:w-auto">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={t("filters.searchCourse")}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 h-10 bg-background border-border/50 shadow-sm transition-colors focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              {/* Filters and Actions */}
              <div className="flex items-center gap-3 w-full sm:w-auto">
                {/* Filters Dropdown */}
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
                  <DropdownMenuContent className="w-72 p-4" align="end">
                    <div className="space-y-4">
                      {/* Status Filter */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">
                          {t("table.status")}
                        </label>
                        <Select
                          value={statusFilter}
                          onValueChange={(value) =>
                            setStatusFilter(value as StatusFilter)
                          }
                        >
                          <SelectTrigger className="w-full h-9 bg-background border-border/50 shadow-sm transition-colors hover:bg-accent/50">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-popover border-border/50 shadow-lg">
                            <SelectItem value="all">
                              {t("filters.allPeriods")}
                            </SelectItem>
                            <SelectItem value="active">
                              {t("status.active")}
                            </SelectItem>
                            <SelectItem value="closed">
                              {t("status.closed")}
                            </SelectItem>
                            <SelectItem value="cancelled">
                              {t("status.cancelled")}
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Category Filter */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">
                          {t("table.category")}
                        </label>
                        <Select
                          value={categoryFilter}
                          onValueChange={(value) =>
                            setCategoryFilter(value as CategoryFilter)
                          }
                        >
                          <SelectTrigger className="w-full h-9 bg-background border-border/50 shadow-sm transition-colors hover:bg-accent/50">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-popover border-border/50 shadow-lg">
                            <SelectItem value="all">
                              {t("filters.allPeriods")}
                            </SelectItem>
                            <SelectItem value="humanities">
                              {t("categories.humanities")}
                            </SelectItem>
                            <SelectItem value="core">
                              {t("categories.core")}
                            </SelectItem>
                            <SelectItem value="elective">
                              {t("categories.electives")}
                            </SelectItem>
                            <SelectItem value="general">General</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Clear Filters */}
                {(activeFiltersCount > 0 || searchTerm !== "") && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSearchTerm("");
                      setStatusFilter("all");
                      setCategoryFilter("all");
                    }}
                    className="h-10 px-3 text-sm text-muted-foreground hover:text-foreground"
                  >
                    Clear all
                  </Button>
                )}

                {/* Print Button */}
                <Button
                  variant="default"
                  className="h-10 px-4 font-medium shadow-sm"
                  onClick={() => window.print()}
                >
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Current Period Table */}
      {!filteredCurrentPeriod || filteredCurrentPeriod.sections.length === 0 ? (
        <div className="bg-card rounded-xl border border-border/50 shadow-sm p-12 text-center">
          <p className="text-muted-foreground">{t("noResults")}</p>
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border/50 shadow-sm overflow-hidden">
          {/* Period Header */}
          <div className="p-4 sm:p-6 border-b border-border/30">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold">
                  {filteredCurrentPeriod.period.nameEs ||
                    filteredCurrentPeriod.period.code}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {new Date(
                    filteredCurrentPeriod.period.startDate,
                  ).toLocaleDateString()}{" "}
                  -{" "}
                  {new Date(
                    filteredCurrentPeriod.period.endDate,
                  ).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">
                    {t("periodSummary.courses")}
                  </p>
                  <p className="text-2xl font-bold text-primary">
                    {filteredCurrentPeriod.totalCourses}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">
                    {t("periodSummary.students")}
                  </p>
                  <p className="text-2xl font-bold text-primary">
                    {filteredCurrentPeriod.totalStudents}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Data Table */}
          <div className="bg-card">
            <DataTable
              columns={columns}
              data={filteredCurrentPeriod.sections}
              onRowClick={handleRowClick}
              searchConfig={null}
              primaryAction={null}
              mobileColumns={{
                primaryColumn: "courseName",
                secondaryColumn: "status",
              }}
              emptyState={{
                title: t("noResults"),
                description: t("noResults"),
              }}
              entityName="courses"
              disablePagination={true}
            />
          </div>
        </div>
      )}

      {/* Period Navigation */}
      {allPeriodsSorted.length > 1 && (
        <div className="flex items-center justify-between bg-card rounded-xl border border-border/50 shadow-sm p-4">
          <Button
            variant="outline"
            onClick={goToNextPeriod}
            disabled={currentPeriodIndex === allPeriodsSorted.length - 1}
            className="gap-2"
          >
            <ChevronDown className="h-4 w-4 rotate-90" />
            {t("navigation.olderPeriod")}
          </Button>

          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              {t("navigation.periodInfo", {
                current: currentPeriodIndex + 1,
                total: allPeriodsSorted.length,
              })}
            </p>
          </div>

          <Button
            variant="outline"
            onClick={goToPreviousPeriod}
            disabled={currentPeriodIndex === 0}
            className="gap-2"
          >
            {t("navigation.newerPeriod")}
            <ChevronDown className="h-4 w-4 -rotate-90" />
          </Button>
        </div>
      )}

      {/* Section Details Dialog */}
      <SectionDetailsDialog
        section={selectedSection}
        open={isDetailsDialogOpen}
        onOpenChange={setIsDetailsDialogOpen}
      />
    </div>
  );
}
