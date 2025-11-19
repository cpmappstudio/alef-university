"use client";
import type { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Translator } from "@/lib/table/types";
import type { ProfessorClassRow } from "@/lib/professors/types";
import { createMultiSelectFilterFn } from "@/lib/table/filter-configs";

const formatCourseName = (row: ProfessorClassRow, locale: string) => {
  const course = row.course;
  if (!course) return "";

  const preferredName =
    locale === "es"
      ? course.nameEs || course.nameEn
      : course.nameEn || course.nameEs;

  return preferredName ?? "";
};

const formatCourseCode = (row: ProfessorClassRow, locale: string) => {
  const course = row.course;
  if (!course) return "";

  const preferredCode =
    locale === "es"
      ? course.codeEs || course.codeEn
      : course.codeEn || course.codeEs;

  return preferredCode ?? "";
};

export const professorClassesColumns = (
  tDetail: Translator,
  tClassDetail: Translator,
  locale: string,
): ColumnDef<ProfessorClassRow>[] => {
  const statusVariants: Record<
    string,
    "default" | "secondary" | "outline" | "destructive"
  > = {
    open: "secondary",
    active: "default",
    grading: "secondary",
    completed: "outline",
  };

  // Custom sorting function for status (grading > active > open > completed)
  const statusSortingFn = (rowA: any, rowB: any) => {
    const statusPriority: Record<string, number> = {
      grading: 1,
      active: 2,
      open: 3,
      completed: 4,
    };

    const statusA = rowA.original.status ?? "open";
    const statusB = rowB.original.status ?? "open";

    const priorityA = statusPriority[statusA] ?? 999;
    const priorityB = statusPriority[statusB] ?? 999;

    return priorityA - priorityB;
  };

  return [
    {
      id: "search",
      accessorFn: (row) => {
        const courseName = formatCourseName(row, locale);
        const courseCode = formatCourseCode(row, locale);
        const bimesterName = row.bimester?.name || "";
        return `${courseName} ${courseCode} ${bimesterName}`.trim();
      },
      header: () => null,
      cell: () => null,
      enableHiding: false,
      enableSorting: false,
    },
    {
      id: "course",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          {tDetail("table.course")}
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      accessorFn: (row) =>
        `${formatCourseName(row, locale)} ${formatCourseCode(row, locale)}`
          .trim()
          .toLowerCase(),
      cell: ({ row }) => {
        const name = formatCourseName(row.original, locale);
        const code = formatCourseCode(row.original, locale);

        return (
          <div className="flex flex-col">
            <span className="font-medium">{name || "-"}</span>
            <span className="text-xs text-muted-foreground">{code}</span>
          </div>
        );
      },
    },
    {
      accessorKey: "groupNumber",
      header: tDetail("table.group"),
      cell: ({ row }) => row.original.groupNumber ?? "-",
    },
    {
      id: "bimester",
      accessorKey: "bimester",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          {tDetail("table.bimester")}
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      accessorFn: (row) => row.bimester?.startDate || "",
      sortingFn: (rowA, rowB) => {
        const dateA = rowA.original.bimester?.startDate;
        const dateB = rowB.original.bimester?.startDate;
        if (!dateA) return 1;
        if (!dateB) return -1;
        return new Date(dateA).getTime() - new Date(dateB).getTime();
      },
      cell: ({ row }) => {
        const bimester = row.original.bimester;
        if (!bimester?.name) return "-";
        return <span className="text-xs sm:text-sm">{bimester.name}</span>;
      },
    },
    {
      id: "status",
      accessorKey: "status",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          {tDetail("table.status")}
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      filterFn: createMultiSelectFilterFn(),
      sortingFn: statusSortingFn,
      cell: ({ row }) => {
        const status = row.original.status ?? "open";
        const variant = statusVariants[status] ?? "secondary";

        return (
          <Badge variant={variant} className="uppercase text-[10px]">
            {tClassDetail(`statusValues.${status}`)}
          </Badge>
        );
      },
    },
    {
      id: "students",
      header: tDetail("table.students"),
      cell: ({ row }) => (
        <span className="font-mono">{row.original.enrolledCount ?? 0}</span>
      ),
    },
  ];
};
