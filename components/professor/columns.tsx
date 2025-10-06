"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { ArrowUpDown } from "lucide-react";
import { TeachingHistorySection } from "./types";

type Translations = {
    table: {
        code: string;
        group: string;
        courseName: string;
        credits: string;
        category: string;
        closingDate: string;
        students: string;
        status: string;
    };
    categories: {
        core: string;
        humanities: string;
        electives: string;
    };
    status: {
        active: string;
        closed: string;
        cancelled: string;
    };
};

export const createColumnsTeachingHistory = (
    t: Translations
): ColumnDef<TeachingHistorySection>[] => [
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
                        {t.table.courseName}
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
                                <span>•</span>
                                <span className="whitespace-nowrap">
                                    {item.enrolledStudents} {t.table.students.toLowerCase()}
                                </span>
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
            accessorKey: "enrolledStudents",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                        className="hidden md:flex"
                    >
                        {t.table.students}
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                );
            },
            cell: ({ row }) => {
                const students = row.getValue("enrolledStudents") as number;
                return (
                    <span className="hidden md:inline text-center font-semibold">
                        {students}
                    </span>
                );
            },
        },
        {
            accessorKey: "closingDate",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                        className="hidden xl:flex"
                    >
                        {t.table.closingDate}
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                );
            },
            cell: ({ row }) => {
                const date = row.getValue("closingDate") as number;
                return (
                    <span className="hidden xl:inline text-sm">
                        {new Date(date).toLocaleDateString()}
                    </span>
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
                    >
                        {t.table.status}
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                );
            },
            cell: ({ row }) => {
                const status = row.getValue("status") as string;
                const statusMap = {
                    active: t.status.active,
                    closed: t.status.closed,
                    cancelled: t.status.cancelled,
                };
                const statusText =
                    statusMap[status as keyof typeof statusMap] || status;

                const getStatusColor = (status: string) => {
                    switch (status) {
                        case "active":
                            return "bg-green-100 text-green-800";
                        case "closed":
                            return "bg-blue-100 text-blue-800";
                        case "cancelled":
                            return "bg-red-100 text-red-800";
                        default:
                            return "bg-gray-100 text-gray-800";
                    }
                };

                return (
                    <span
                        className={`px-2 py-1 rounded-full text-xs ${getStatusColor(status)}`}
                    >
                        {statusText}
                    </span>
                );
            },
        },
    ];

// Export default columns for backward compatibility
export const columnsTeachingHistory = createColumnsTeachingHistory({
    table: {
        code: "Code",
        group: "Group",
        courseName: "Course Name",
        credits: "Credits",
        category: "Category",
        closingDate: "Closing Date",
        students: "Students",
        status: "Status",
    },
    categories: {
        core: "Core",
        humanities: "Humanities",
        electives: "Electives",
    },
    status: {
        active: "Active",
        closed: "Closed",
        cancelled: "Cancelled",
    },
});
