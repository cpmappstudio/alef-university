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
import { exportProgramsToPDF } from "@/lib/export-programs-pdf";

export default function ProgramManagementPage() {
  const t = useTranslations("admin.programs.table");
  const tExport = useTranslations("admin.programs.export");

  const locale = useLocale();

  const router = useRouter();

  const data = useQuery(api.programs.getAllPrograms, {});

  const categories = useQuery(api.programs.getProgramCategories, {});

  const categoryLabels = React.useMemo(() => {
    if (!categories) {
      return {};
    }

    return categories.reduce<Record<string, string>>((acc, category) => {
      const trimmedName = category.name.trim();
      acc[String(category._id)] = trimmedName || category.name;
      return acc;
    }, {});
  }, [categories]);

  const columns = React.useMemo(
    () => programColumns(t, locale, categoryLabels),
    [t, locale, categoryLabels],
  );

  const handleRowClick = React.useCallback(
    (program: Doc<"programs">) => {
      router.push(`/${locale}/admin/programs/${program._id}`);
    },
    [router, locale],
  );

  const handleExport = React.useCallback(
    (rows: Doc<"programs">[]) => {
      exportProgramsToPDF({
        programs: rows,
        categoryLabels,
        locale,
        translations: {
          title: tExport("title"),
          generatedOn: tExport("generatedOn"),
          totalPrograms: tExport("totalPrograms"),
          page: tExport("page"),
          of: tExport("of"),
          columns: {
            code: t("columns.code"),
            program: t("columns.program"),
            type: t("columns.type"),
            category: t("columns.category"),
            language: t("columns.language"),
            credits: t("columns.credits"),
            duration: t("columns.duration"),
            status: t("columns.status"),
          },
          types: {
            diploma: t("types.diploma"),
            bachelor: t("types.bachelor"),
            master: t("types.master"),
            doctorate: t("types.doctorate"),
          },
          languages: {
            es: t("languages.es"),
            en: t("languages.en"),
            both: t("languages.both"),
          },
          status: {
            active: t("status.active"),
            inactive: t("status.inactive"),
          },
          emptyValue: t("columns.emptyValue"),
        },
      });
    },
    [categoryLabels, locale, t, tExport],
  );

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
