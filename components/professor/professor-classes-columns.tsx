"use client";
import type { ColumnDef } from "@tanstack/react-table";

import { Badge } from "@/components/ui/badge";
import type { Translator } from "@/lib/table/types";
import type { ProfessorClassRow } from "@/lib/professors/types";

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

  return [
    {
      id: "course",
      header: tDetail("table.course"),
      accessorFn: (row) =>
        `${formatCourseName(row, locale)} ${formatCourseCode(row, locale)}`.trim(),
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
      accessorKey: "bimester",
      header: tDetail("table.bimester"),
      cell: ({ row }) => {
        const bimester = row.original.bimester;
        if (!bimester?.name) return "-";
        return <span className="text-xs sm:text-sm">{bimester.name}</span>;
      },
    },
    {
      id: "status",
      header: tDetail("table.status"),
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
