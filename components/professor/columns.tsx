"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { createStatusColumn } from "@/components/table/column-helpers";
import type { Translator } from "@/lib/table/types";
import type { ProfessorDocument } from "@/lib/professors/types";

export const professorColumns = (
  t: Translator,
): ColumnDef<ProfessorDocument>[] => {
  const emptyValue = t("columns.emptyValue");

  return [
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
      accessorKey: "email",
      header: t("columns.email"),
      cell: ({ row }) => (
        <span className="font-mono text-sm">{row.original.email}</span>
      ),
    },
    {
      accessorKey: "phone",
      header: t("columns.phone"),
      cell: ({ row }) => row.original.phone ?? emptyValue,
    },
    {
      accessorKey: "country",
      header: t("columns.country"),
      cell: ({ row }) => row.original.country ?? emptyValue,
    },
    createStatusColumn<ProfessorDocument>(t),
  ];
};
