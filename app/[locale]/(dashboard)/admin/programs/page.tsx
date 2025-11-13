"use client";

import * as React from "react";
import CustomTable from "@/components/ui/custom-table";
import { programColumns } from "@/components/admin/program/columns";
import { useLocale, useTranslations } from "next-intl";
import { useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { Separator } from "@/components/ui/separator";

import ProgramActions from "@/components/admin/program/program-actions";

export default function ProgramManagementPage() {
  const t = useTranslations("admin.programs.table");
  const locale = useLocale();
  const router = useRouter();
  const data = useQuery(api.programs.getAllPrograms, {});

  const columns = React.useMemo(() => programColumns(t, locale), [t, locale]);

  const handleRowClick = React.useCallback(
    (program: Doc<"programs">) => {
      router.push(`/${locale}/admin/programs/${program._id}`);
    },
    [router, locale],
  );

  const handleExport = React.useCallback((rows: Doc<"programs">[]) => {
    // Implementa tu lógica de exportación: CSV, XLSX, PDF, etc.
    // Aquí un ejemplo muy básico que simplemente registra las filas:
    console.log("Programas a exportar:", rows);
  }, []);

  const filterColumnKey = "program";

  return (
    <>
      <ProgramActions />
      <Separator className="" />
      <CustomTable
        columns={columns}
        data={data}
        filterColumn={filterColumnKey}
        filterPlaceholder={t("filterPlaceholder")}
        columnsMenuLabel={t("columnsMenuLabel")}
        emptyMessage={t("emptyMessage")}
        onRowClick={handleRowClick}
        onExport={handleExport}
      />
    </>
  );
}
