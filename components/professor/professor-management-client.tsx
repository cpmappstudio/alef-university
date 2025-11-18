"use client";

/* hooks */
import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";

/* lib */
import { api } from "@/convex/_generated/api";
import type {
  ProfessorDocument,
  ProfessorManagementClientProps,
} from "@/lib/professors/types";
import { ROUTES } from "@/lib/routes";
import { exportProfessorsToJSONL } from "@/lib/professors/utils";

/* components */
import { professorColumns } from "@/components/professor/columns";
import { ProfessorActions } from "@/components/professor/professor-actions";
import CustomTable from "@/components/ui/custom-table";
import { Separator } from "@/components/ui/separator";

export function ProfessorManagementClient({
  professors,
}: ProfessorManagementClientProps) {
  const t = useTranslations("admin.professors.table");
  const locale = useLocale();
  const router = useRouter();

  const liveProfessors = useQuery(api.users.getAllUsers, {
    role: "professor",
  });
  const tableData = React.useMemo(
    () => liveProfessors ?? professors,
    [liveProfessors, professors],
  );

  const columns = React.useMemo(() => professorColumns(t), [t]);

  const handleRowClick = React.useCallback(
    (professor: ProfessorDocument) => {
      router.push(
        ROUTES.professors.details(professor.clerkId).withLocale(locale),
      );
    },
    [router, locale],
  );

  const handleExport = React.useCallback((rows: ProfessorDocument[]) => {
    exportProfessorsToJSONL(rows);
  }, []);

  return (
    <>
      <ProfessorActions />
      <Separator />
      <CustomTable
        columns={columns}
        data={tableData}
        filterColumn="name"
        filterPlaceholder={t("filterPlaceholder", {
          defaultMessage: "Search professors...",
        })}
        columnsMenuLabel={t("columnsMenuLabel", { defaultMessage: "Columns" })}
        emptyMessage={t("emptyMessage", {
          defaultMessage: "No professors found.",
        })}
        onRowClick={handleRowClick}
        onExport={handleExport}
      />
    </>
  );
}
