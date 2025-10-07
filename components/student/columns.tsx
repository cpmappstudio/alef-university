"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { ArrowUpDown } from "lucide-react";
import { EnrollmentHistoryItem } from "./types";

type Translations = {
    table: {
        code: string;
        group: string;
        subject: string;
        credits: string;
        category: string;
        letterGrade: string;
        status: string;
    };
    categories: {
        core: string;
        humanities: string;
        electives: string;
    };
    status: {
        passed: string;
        failed: string;
        inProgress: string;
        withdrawn: string;
        incomplete: string;
    };
};

export const createColumnsAcademicHistory = (
    t: Translations
): ColumnDef<EnrollmentHistoryItem>[] => [
        {
            accessorKey: "courseCode",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                        className="hidden lg:flex"
                    >
                        {t.table.code}
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                );
            },
            cell: ({ row }) => {
                const code = row.getValue("courseCode") as string;
                return <span className="hidden lg:inline font-mono text-sm">{code}</span>;
            },
        },
        {
            accessorKey: "groupNumber",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                        className="hidden md:flex"
                    >
                        {t.table.group}
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                );
            },
            cell: ({ row }) => {
                const group = row.getValue("groupNumber") as string;
                return <span className="hidden md:inline">{group}</span>;
            },
        },
        {
            accessorKey: "courseName",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    >
                        {t.table.subject}
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                );
            },
            cell: ({ row }) => {
                const item = row.original;
                const categoryMap = {
                    humanities: t.categories.humanities,
                    core: t.categories.core,
                    elective: t.categories.electives,
                    general: "General",
                };
                const categoryText =
                    categoryMap[item.category as keyof typeof categoryMap] || item.category;

                return (
                    <div className="space-y-1 w-full">
                        <div className="whitespace-normal break-words md:overflow-hidden md:text-ellipsis lg:break-normal lg:overflow-visible lg:text-clip">
                            {item.courseName}
                        </div>
                        {/* Mobile/Tablet view: show additional info below name */}
                        <div className="block lg:hidden text-sm text-muted-foreground space-y-1">
                            <div className="flex items-center gap-2">
                                <span className="text-xs bg-muted px-2 py-0.5 rounded font-mono">
                                    {item.courseCode}
                                </span>
                                <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                                    {t.table.group} {item.groupNumber}
                                </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-1 text-xs">
                                <span className="capitalize whitespace-nowrap">
                                    {categoryText}
                                </span>
                                <span>•</span>
                                <span className="whitespace-nowrap">
                                    {item.credits} {t.table.credits.toLowerCase()}
                                </span>
                                {item.isRetake && (
                                    <>
                                        <span>•</span>
                                        <span className="text-orange-600 font-medium">Retake</span>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                );
            },
        },
        {
            accessorKey: "credits",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                        className="hidden lg:flex"
                    >
                        {t.table.credits}
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                );
            },
            cell: ({ row }) => {
                const credits = row.getValue("credits") as number;
                return <span className="hidden lg:inline">{credits}</span>;
            },
        },
        {
            accessorKey: "category",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                        className="hidden lg:flex"
                    >
                        {t.table.category}
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                );
            },
            cell: ({ row }) => {
                const category = row.getValue("category") as string;
                const categoryMap = {
                    humanities: t.categories.humanities,
                    core: t.categories.core,
                    elective: t.categories.electives,
                    general: "General",
                };
                return (
                    <span className="capitalize hidden lg:inline">
                        {categoryMap[category as keyof typeof categoryMap] || category}
                    </span>
                );
            },
        },
        {
            accessorKey: "letterGrade",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    >
                        {t.table.letterGrade}
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                );
            },
            cell: ({ row }) => {
                const letterGrade = row.getValue("letterGrade") as string | undefined;
                const percentageGrade = row.original.percentageGrade;

                if (!letterGrade) {
                    return <span className="text-muted-foreground text-sm">Pending</span>;
                }

                // Determine grade color
                const getGradeColor = (grade: string) => {
                    if (grade.startsWith("A")) return "bg-green-100 text-green-800";
                    if (grade.startsWith("B")) return "bg-blue-100 text-blue-800";
                    if (grade.startsWith("C")) return "bg-yellow-100 text-yellow-800";
                    if (grade.startsWith("D")) return "bg-orange-100 text-orange-800";
                    return "bg-red-100 text-red-800";
                };

                return (
                    <div className="space-y-1">
                        <span
                            className={`px-2 py-1 rounded text-xs font-semibold ${getGradeColor(letterGrade)}`}
                        >
                            {letterGrade}
                        </span>
                        {percentageGrade !== undefined && (
                            <span className="hidden lg:inline text-xs text-muted-foreground ml-2">
                                ({percentageGrade.toFixed(1)}%)
                            </span>
                        )}
                    </div>
                );
            },
        },
        {
            accessorKey: "status",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                        className="hidden md:flex"
                    >
                        {t.table.status}
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                );
            },
            cell: ({ row }) => {
                const status = row.getValue("status") as string;
                const statusMap = {
                    enrolled: t.status.inProgress,
                    completed: t.status.passed,
                    failed: t.status.failed,
                    withdrawn: t.status.withdrawn,
                    dropped: t.status.withdrawn,
                    in_progress: t.status.inProgress,
                    incomplete: t.status.incomplete,
                };
                const statusText =
                    statusMap[status as keyof typeof statusMap] || status;

                const getStatusColor = (status: string) => {
                    switch (status) {
                        case "completed":
                            return "bg-green-100 text-green-800";
                        case "in_progress":
                        case "enrolled":
                            return "bg-blue-100 text-blue-800";
                        case "failed":
                            return "bg-red-100 text-red-800";
                        case "withdrawn":
                        case "dropped":
                            return "bg-gray-100 text-gray-800";
                        case "incomplete":
                            return "bg-yellow-100 text-yellow-800";
                        default:
                            return "bg-gray-100 text-gray-800";
                    }
                };

                return (
                    <span
                        className={`hidden md:inline px-2 py-1 rounded-full text-xs ${getStatusColor(status)}`}
                    >
                        {statusText}
                    </span>
                );
            },
        },
    ];

// Export default columns for backward compatibility
export const columnsAcademicHistory = createColumnsAcademicHistory({
    table: {
        code: "Code",
        group: "Group",
        subject: "Course Name",
        credits: "Credits",
        category: "Category",
        letterGrade: "Grade",
        status: "Status",
    },
    categories: {
        core: "Core",
        humanities: "Humanities",
        electives: "Electives",
    },
    status: {
        passed: "Completed",
        failed: "Failed",
        inProgress: "In Progress",
        withdrawn: "Withdrawn",
        incomplete: "Incomplete",
    },
});
