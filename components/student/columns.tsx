"use client";

import type { ColumnDef } from "@tanstack/react-table";
import {
  createStatusColumn,
  createSearchColumn,
} from "@/components/table/column-helpers";
import type { Translator } from "@/lib/table/types";
import type { StudentDocument } from "@/lib/students/types";
import { createMultiSelectFilterFn } from "@/lib/table/filter-configs";

export const studentColumns = (
  t: Translator,
  programLabels?: Record<string, string>,
): ColumnDef<StudentDocument>[] => {
  const emptyValue = "—";
  const multiSelectFilter = createMultiSelectFilterFn<StudentDocument>();

  return [
    {
      id: "search",
      accessorFn: (row) => {
        const name = `${row.firstName ?? ""} ${row.lastName ?? ""}`.trim();
        const code = row.studentProfile?.studentCode ?? "";
        const programId = row.studentProfile?.programId;
        const programName =
          programId && programLabels
            ? (programLabels[programId.toString()] ?? "")
            : "";
        return `${name} ${code} ${programName}`.toLowerCase();
      },
      enableHiding: false,
      enableSorting: false,
      enableColumnFilter: true,
      meta: {
        filterOnly: true,
      },
    },
    {
      id: "name",
      accessorFn: (row) =>
        `${row.firstName ?? ""} ${row.lastName ?? ""}`.trim(),
      header: t("columns.name"),
      cell: ({ row }) => {
        const firstName = row.original.firstName;
        const lastName = row.original.lastName;
        const displayName =
          firstName || lastName
            ? `${firstName ?? ""} ${lastName ?? ""}`.trim()
            : row.original.email;
        return displayName || emptyValue;
      },
    },
    {
      accessorKey: "studentCode",
      header: t("columns.studentCode"),
      cell: ({ row }) => row.original.studentProfile?.studentCode ?? emptyValue,
    },
    {
      accessorKey: "email",
      header: t("columns.email"),
      cell: ({ row }) => (
        <span className="font-mono text-sm">{row.original.email}</span>
      ),
    },
    {
      id: "programId",
      accessorFn: (row) => row.studentProfile?.programId ?? "",
      header: t("columns.program"),
      cell: ({ row }) => {
        const programId = row.original.studentProfile?.programId;
        if (!programId) return emptyValue;
        const idString = programId.toString();
        return programLabels?.[idString] ?? `${idString.slice(0, 8)}…`;
      },
    },
    {
      ...createStatusColumn<StudentDocument>(t),
      filterFn: multiSelectFilter,
      enableColumnFilter: true,
    },
  ];
};
