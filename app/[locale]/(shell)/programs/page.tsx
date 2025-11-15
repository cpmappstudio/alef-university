// ################################################################################
// # File: page.tsx                                                               #
// # Check: 11/15/2025                                                            #
// # 1 TODO                                                                       #
// ################################################################################

// TODO: Make this file a server component by retrieving data from Convex.
"use client";

/* Hooks */
import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";

/* UI */
import { Separator } from "@/components/ui/separator";
import CustomTable from "@/components/ui/custom-table";
import { programColumns } from "@/components/program/columns";
import ProgramActions from "@/components/program/program-actions";

/* Convex */
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";

/* Lib */
import { exportProgramsToPDF } from "@/lib/export-programs-pdf";
import {
  buildProgramDetailsPath,
  buildProgramExportTranslations,
  createProgramCategoryLabelMap,
  PROGRAMS_TABLE_FILTER_COLUMN,
} from "@/lib/programs/utils";

export default function ProgramManagementPage() {
  const t = useTranslations("admin.programs.table");
  const tExport = useTranslations("admin.programs.export");
  const locale = useLocale();
  const router = useRouter();
  const data = useQuery(api.programs.getAllPrograms, {});
  const categories = useQuery(api.programs.getProgramCategories, {});

  const categoryLabels = React.useMemo(
    () => createProgramCategoryLabelMap(categories),
    [categories],
  );

  const columns = React.useMemo(
    () => programColumns(t, locale, categoryLabels),
    [t, locale, categoryLabels],
  );

  const exportTranslations = React.useMemo(
    () => buildProgramExportTranslations(t, tExport),
    [t, tExport],
  );

  const handleRowClick = React.useCallback(
    (program: Doc<"programs">) => {
      router.push(buildProgramDetailsPath(locale, program._id));
    },
    [router, locale],
  );

  const handleExport = React.useCallback(
    (rows: Doc<"programs">[]) => {
      exportProgramsToPDF({
        programs: rows,
        categoryLabels,
        locale,
        translations: exportTranslations,
      });
    },
    [categoryLabels, exportTranslations, locale],
  );

  return (
    <>
      <ProgramActions />
      <Separator />
      <CustomTable
        columns={columns}
        data={data}
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
