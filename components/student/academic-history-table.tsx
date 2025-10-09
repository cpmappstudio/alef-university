"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { createColumnsAcademicHistory } from "./columns";
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
import { Search, Download, Filter, ChevronDown } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EnrollmentHistoryItem, PeriodHistorySummary } from "./types";
import { CourseDetailsDialog } from "./course-details-dialog";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

type StatusFilter = "all" | "completed" | "failed" | "withdrawn" | "in_progress";
type CategoryFilter = "all" | "humanities" | "core" | "elective" | "general";

// Mock data for development
const mockAcademicHistory = {
    overallGPA: {
        gpa: 3.85,
        totalCredits: 45,
        attemptedCredits: 48,
        earnedCredits: 45,
        gradePoints: 173.25,
    },
    history: [
        {
            period: {
                _id: "period1" as any,
                code: "2025-B1",
                nameEs: "Primer Bimestre 2025",
                startDate: new Date("2025-01-15").getTime(),
                endDate: new Date("2025-03-15").getTime(),
            },
            enrollments: [
                {
                    enrollment: { _id: "e1" as any, status: "completed", letterGrade: "A", percentageGrade: 95, gradePoints: 4.0, isRetake: false },
                    course: { _id: "c1" as any, code: "THEO-101", nameEs: "Teología Sistemática I", credits: 3, category: "humanities", descriptionEs: "Introducción a los fundamentos de la teología sistemática cristiana." },
                    section: { _id: "s1" as any, groupNumber: "01", schedule: { sessions: [{ day: "monday", startTime: "14:00", endTime: "16:00" }], timezone: "America/Bogota" } },
                    professor: { _id: "p1" as any, firstName: "Juan", lastName: "Pérez" },
                },
                {
                    enrollment: { _id: "e2" as any, status: "completed", letterGrade: "B+", percentageGrade: 88, gradePoints: 3.3, isRetake: false },
                    course: { _id: "c2" as any, code: "BIBL-101", nameEs: "Introducción al Antiguo Testamento", credits: 3, category: "core", descriptionEs: "Estudio panorámico de los libros del Antiguo Testamento." },
                    section: { _id: "s2" as any, groupNumber: "02" },
                    professor: { _id: "p2" as any, firstName: "María", lastName: "González" },
                },
                {
                    enrollment: { _id: "e3" as any, status: "completed", letterGrade: "A-", percentageGrade: 91, gradePoints: 3.7, isRetake: false },
                    course: { _id: "c3" as any, code: "HIST-101", nameEs: "Historia de la Iglesia Primitiva", credits: 3, category: "core", descriptionEs: "Estudio de los primeros 500 años de historia cristiana." },
                    section: { _id: "s3" as any, groupNumber: "01" },
                    professor: { _id: "p3" as any, firstName: "Carlos", lastName: "Rodríguez" },
                },
            ],
            summary: { gpa: 3.67, totalCredits: 9, earnedCredits: 9 },
        },
        {
            period: {
                _id: "period2" as any,
                code: "2024-B6",
                nameEs: "Sexto Bimestre 2024",
                startDate: new Date("2024-11-01").getTime(),
                endDate: new Date("2024-12-31").getTime(),
            },
            enrollments: [
                {
                    enrollment: { _id: "e4" as any, status: "completed", letterGrade: "A+", percentageGrade: 98, gradePoints: 4.0, isRetake: false },
                    course: { _id: "c4" as any, code: "GREC-102", nameEs: "Griego Bíblico II", credits: 4, category: "core", descriptionEs: "Continuación del estudio del griego koiné aplicado al Nuevo Testamento." },
                    section: { _id: "s4" as any, groupNumber: "01" },
                    professor: { _id: "p4" as any, firstName: "Ana", lastName: "Martínez" },
                },
                {
                    enrollment: { _id: "e5" as any, status: "completed", letterGrade: "A", percentageGrade: 94, gradePoints: 4.0, isRetake: false },
                    course: { _id: "c5" as any, code: "HERM-201", nameEs: "Hermenéutica Bíblica", credits: 3, category: "core", descriptionEs: "Principios y métodos de interpretación bíblica." },
                    section: { _id: "s5" as any, groupNumber: "02" },
                    professor: { _id: "p5" as any, firstName: "Pedro", lastName: "Sánchez" },
                },
                {
                    enrollment: { _id: "e6" as any, status: "completed", letterGrade: "B", percentageGrade: 85, gradePoints: 3.0, isRetake: false },
                    course: { _id: "c6" as any, code: "ECON-101", nameEs: "Economía General", credits: 2, category: "general", descriptionEs: "Fundamentos de economía aplicados al ministerio." },
                    section: { _id: "s6" as any, groupNumber: "01" },
                    professor: { _id: "p6" as any, firstName: "Laura", lastName: "Torres" },
                },
            ],
            summary: { gpa: 3.78, totalCredits: 9, earnedCredits: 9 },
        },
    ],
};

export default function AcademicHistoryTable() {
    const t = useTranslations("academicHistory");

    const academicHistory = useQuery(api.students.getMyAcademicHistory);

    // Create columns with translations
    const columns = React.useMemo(
        () =>
            createColumnsAcademicHistory({
                table: {
                    code: t("table.code"),
                    group: t("table.group"),
                    subject: t("table.subject"),
                    credits: t("table.credits"),
                    category: t("table.category"),
                    letterGrade: t("table.letterGrade"),
                    status: t("table.status"),
                },
                categories: {
                    core: t("categories.core"),
                    humanities: t("categories.humanities"),
                    electives: t("categories.electives"),
                },
                status: {
                    passed: t("status.passed"),
                    failed: t("status.failed"),
                    inProgress: t("status.inProgress"),
                    withdrawn: t("status.withdrawn"),
                    incomplete: t("status.incomplete"),
                },
            }),
        [t]
    );
    
    const [searchTerm, setSearchTerm] = React.useState("");
    const [selectedPeriod, setSelectedPeriod] = React.useState<string>("all");
    const [statusFilter, setStatusFilter] = React.useState<StatusFilter>("all");
    const [categoryFilter, setCategoryFilter] =
        React.useState<CategoryFilter>("all");
    const [selectedCourse, setSelectedCourse] =
        React.useState<EnrollmentHistoryItem | null>(null);
    const [isDetailsDialogOpen, setIsDetailsDialogOpen] = React.useState(false);

    const periodSummaries = React.useMemo<PeriodHistorySummary[]>(() => {
        if (!academicHistory?.history) return [];

        let accumulatedCredits = 0;
        let accumulatedApprovedCredits = 0;

        return academicHistory.history.map((periodData) => {
        const enrollments: EnrollmentHistoryItem[] = periodData.enrollments.map(
            (item) => ({
            _id: item.enrollment._id,
            courseCode: item.course?.code || "N/A",
            courseName: item.course?.nameEs || "Unknown Course",
            groupNumber: item.section?.groupNumber || "N/A",
            credits: item.course?.credits || 0,
            category: item.course?.category || "general",
            letterGrade: item.enrollment?.letterGrade,
            percentageGrade: item.enrollment?.percentageGrade,
            gradePoints: item.enrollment?.gradePoints,
            status: item.enrollment?.status || "unknown",
            isRetake: item.enrollment?.isRetake || false,
            professorName: item.professor
                ? `${item.professor.firstName} ${item.professor.lastName}`
                : "TBD",
            enrollment: item.enrollment,
            course: item.course,
            section: item.section,
            professor: item.professor,
            })
        );

        const enrolledCredits = enrollments.reduce(
            (sum, e) => sum + e.credits,
            0
        );
        const approvedCredits = enrollments
            .filter((e) => e.status === "completed" && e.percentageGrade && e.percentageGrade >= 65)
            .reduce((sum, e) => sum + e.credits, 0);

        accumulatedCredits += enrolledCredits;
        accumulatedApprovedCredits += approvedCredits;

        return {
            period: periodData.period,
            enrollments,
            enrolledCredits,
            approvedCredits,
            approvalPercentage: enrolledCredits > 0 ? (approvedCredits / enrolledCredits) * 100 : 0,
            periodGPA: periodData.summary?.gpa || 0,
            accumulatedCredits,
            accumulatedApprovedCredits,
        };
        });
    }, [academicHistory]);

    // Filter data
    const filteredPeriods = React.useMemo(() => {
        if (!periodSummaries) return [];

        return periodSummaries
            .map((periodSummary) => {
                // Period filter
                if (
                    selectedPeriod !== "all" &&
                    periodSummary.period._id !== selectedPeriod
                ) {
                    return null;
                }

                // Filter enrollments within each period (create a new filtered array, don't mutate)
                const filteredEnrollments = periodSummary.enrollments.filter(
                    (enrollment) => {
                        // Search filter
                        const searchMatch =
                            searchTerm === "" ||
                            enrollment.courseName
                                .toLowerCase()
                                .includes(searchTerm.toLowerCase()) ||
                            enrollment.courseCode
                                .toLowerCase()
                                .includes(searchTerm.toLowerCase());

                        // Status filter
                        const statusMatch =
                            statusFilter === "all" || enrollment.status === statusFilter;

                        // Category filter
                        const catMatch =
                            categoryFilter === "all" ||
                            enrollment.category === categoryFilter;

                        return searchMatch && statusMatch && catMatch;
                    }
                );

                // Only show periods that have enrollments after filtering
                if (filteredEnrollments.length === 0) {
                    return null;
                }

                // Return a new object with filtered enrollments
                return {
                    ...periodSummary,
                    enrollments: filteredEnrollments,
                };
            })
            .filter((period): period is PeriodHistorySummary => period !== null)
            .reverse(); // Most recent first
    }, [periodSummaries, searchTerm, selectedPeriod, statusFilter, categoryFilter]);

    // Count active filters
    const activeFiltersCount = React.useMemo(() => {
        let count = 0;
        if (statusFilter !== "all") count++;
        if (categoryFilter !== "all") count++;
        if (selectedPeriod !== "all") count++;
        return count;
    }, [statusFilter, categoryFilter, selectedPeriod]);

    const handleRowClick = (course: EnrollmentHistoryItem) => {
        setSelectedCourse(course);
        setIsDetailsDialogOpen(true);
    };

    if (academicHistory === undefined) {
        return (
            <div className="flex items-center justify-center min-h-[400px] bg-card rounded-xl border border-border/50 shadow-sm">
                <div className="flex flex-col items-center space-y-4 p-8">
                    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-muted-foreground font-medium">
                        {t("title")}...
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 sm:space-y-8">
            {/* Filters Container */}
            <div className="bg-card rounded-xl border border-border/50 shadow-sm overflow-hidden mx-1 sm:mx-0">
                <div className="p-3 sm:p-4 lg:p-6 border-b border-border/30 bg-card">
                    <div className="space-y-4">
                        {/* Cumulative GPA Display */}
                        <div className="flex items-center justify-between p-4 bg-primary/5 rounded-lg border border-primary/20">
                            <div>
                                <p className="text-sm text-muted-foreground font-medium">
                                    {t("overallSummary.overallGPA")}
                                </p>
                                <p className="text-3xl font-bold text-primary">
                                    {academicHistory?.overallGPA?.gpa?.toFixed(2) || "0.00"}
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="text-sm text-muted-foreground">{t("overallSummary.totalCreditsCompleted")}</p>
                                <p className="text-xl font-semibold">
                                    {academicHistory?.overallGPA?.totalCredits || 0}
                                </p>
                            </div>
                        </div>

                        {/* Filters Row */}
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                            {/* Search Input */}
                            <div className="flex-1 w-full sm:w-auto">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder={t("filters.searchSubject")}
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
                                            {/* Period Filter */}
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium text-foreground">
                                                    {t("filters.filterByPeriod")}
                                                </label>
                                                <Select
                                                    value={selectedPeriod}
                                                    onValueChange={setSelectedPeriod}
                                                >
                                                    <SelectTrigger className="w-full h-9 bg-background border-border/50 shadow-sm transition-colors hover:bg-accent/50">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent className="bg-popover border-border/50 shadow-lg">
                                                        <SelectItem value="all">{t("filters.allPeriods")}</SelectItem>
                                                        {periodSummaries.map((ps) => (
                                                            <SelectItem key={ps.period._id} value={ps.period._id}>
                                                                {ps.period.nameEs || ps.period.code}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>

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
                                                        <SelectItem value="all">{t("filters.allPeriods")}</SelectItem>
                                                        <SelectItem value="completed">{t("status.passed")}</SelectItem>
                                                        <SelectItem value="failed">{t("status.failed")}</SelectItem>
                                                        <SelectItem value="in_progress">
                                                            {t("status.inProgress")}
                                                        </SelectItem>
                                                        <SelectItem value="withdrawn">{t("status.withdrawn")}</SelectItem>
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
                                                        <SelectItem value="all">{t("filters.allPeriods")}</SelectItem>
                                                        <SelectItem value="humanities">
                                                            {t("categories.humanities")}
                                                        </SelectItem>
                                                        <SelectItem value="core">{t("categories.core")}</SelectItem>
                                                        <SelectItem value="elective">{t("categories.electives")}</SelectItem>
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
                                            setSelectedPeriod("all");
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

            {/* Period Tables */}
            {filteredPeriods.length === 0 ? (
                <div className="bg-card rounded-xl border border-border/50 shadow-sm p-12 text-center">
                    <p className="text-muted-foreground">{t("noResults")}</p>
                </div>
            ) : (
                filteredPeriods.map((periodSummary) => (
                    <div
                        key={periodSummary.period._id}
                        className="bg-card rounded-xl border border-border/50 shadow-sm overflow-hidden"
                    >
                        {/* Period Header */}
                        <div className="p-4 sm:p-6 border-b border-border/30">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                <div>
                                    <h2 className="text-xl sm:text-2xl font-bold">
                                        {periodSummary.period.nameEs || periodSummary.period.code}
                                    </h2>
                                    <p className="text-sm text-muted-foreground">
                                        {new Date(periodSummary.period.startDate).toLocaleDateString()} -{" "}
                                        {new Date(periodSummary.period.endDate).toLocaleDateString()}
                                    </p>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="text-right">
                                        <p className="text-sm text-muted-foreground">{t("periodSummary.periodGPA")}</p>
                                        <p className="text-2xl font-bold text-primary">
                                            {periodSummary.periodGPA.toFixed(2)}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Data Table */}
                        <div className="bg-card">
                            <DataTable
                                columns={columns}
                                data={periodSummary.enrollments}
                                onRowClick={handleRowClick}
                                searchConfig={null}
                                primaryAction={null}
                                mobileColumns={{
                                    primaryColumn: "courseName",
                                    secondaryColumn: "letterGrade",
                                }}
                                emptyState={{
                                    title: t("noResults"),
                                    description: t("noResults"),
                                }}
                                entityName="courses"
                                disablePagination={true}
                            />
                        </div>

                        {/* Period Summary */}
                        <div className="p-4 sm:p-6 bg-muted/30 border-t border-border/30">
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                                <div className="space-y-1">
                                    <p className="text-xs text-muted-foreground font-medium">
                                        {t("periodSummary.creditsEnrolled")}
                                    </p>
                                    <p className="text-lg font-bold">
                                        {periodSummary.enrolledCredits}
                                    </p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs text-muted-foreground font-medium">
                                        {t("periodSummary.creditsApproved")}
                                    </p>
                                    <p className="text-lg font-bold text-green-600">
                                        {periodSummary.approvedCredits}
                                    </p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs text-muted-foreground font-medium">
                                        {t("periodSummary.percentApproved")}
                                    </p>
                                    <p className="text-lg font-bold">
                                        {periodSummary.approvalPercentage.toFixed(0)}%
                                    </p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs text-muted-foreground font-medium">
                                        {t("periodSummary.cumulativeCredits")}
                                    </p>
                                    <p className="text-lg font-bold">
                                        {periodSummary.accumulatedCredits}
                                    </p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs text-muted-foreground font-medium">
                                        {t("periodSummary.cumulativeApproved")}
                                    </p>
                                    <p className="text-lg font-bold text-green-600">
                                        {periodSummary.accumulatedApprovedCredits}
                                    </p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs text-muted-foreground font-medium">
                                        {t("periodSummary.periodGPA")}
                                    </p>
                                    <p className="text-lg font-bold text-primary">
                                        {periodSummary.periodGPA.toFixed(2)}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                ))
            )}

            {/* Course Details Dialog */}
            <CourseDetailsDialog
                course={selectedCourse}
                open={isDetailsDialogOpen}
                onOpenChange={setIsDetailsDialogOpen}
            />
        </div>
    );
}
