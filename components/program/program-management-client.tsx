// ################################################################################
// # File: page.tsx                                                               #
// # Check: 11/15/2025                                                            #
// ################################################################################

"use client";

/* hooks */
import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";

/* components */
import { Separator } from "@/components/ui/separator";
import CustomTable from "@/components/ui/custom-table";
import ProgramActions from "@/components/program/program-actions";
import { programColumns } from "@/components/program/columns";

/* lib */
import { exportProgramsToPDF } from "@/lib/export-programs-pdf";
import {
  buildProgramDetailsPath,
  buildProgramExportTranslations,
  createProgramCategoryLabelMap,
  PROGRAMS_TABLE_FILTER_COLUMN,
} from "@/lib/programs/utils";
import type {
  ProgramDocument,
  ProgramManagementClientProps,
} from "@/lib/programs/types";

export default function ProgramManagementClient({
  programs,
  categories,
}: ProgramManagementClientProps) {
  const t = useTranslations("admin.programs.table");
  const tExport = useTranslations("admin.programs.export");
  const locale = useLocale();
  const router = useRouter();

  const categoryLabels = React.useMemo(
    () => createProgramCategoryLabelMap(categories),
    [categories],
  );

  const columns = React.useMemo(
    () => programColumns(t, locale, categoryLabels),
    [t, locale, categoryLabels],
  );

  const exportTranslations = buildProgramExportTranslations(t, tExport);

  const handleRowClick = (program: ProgramDocument) => {
    router.push(buildProgramDetailsPath(locale, program._id));
  };

  const handleExport = (rows: ProgramDocument[]) => {
    exportProgramsToPDF({
      programs: rows,
      categoryLabels,
      locale,
      translations: exportTranslations,
    });
  };

  return (
    <>
      <ProgramActions />
      <Separator />
      <CustomTable
        columns={columns}
        data={programs}
        filterColumn={PROGRAMS_TABLE_FILTER_COLUMN}
        filterPlaceholder={t("filterPlaceholder")}
        columnsMenuLabel={t("columnsMenuLabel")}
        emptyMessage={t("emptyMessage")}
        onRowClick={handleRowClick}
        onExport={handleExport}
      />
    </>
  );
}
