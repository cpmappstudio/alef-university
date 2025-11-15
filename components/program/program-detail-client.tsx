// ################################################################################
// # File: program-detail-client.tsx                                              #
// # Check: 11/15/2025                                                            #
// ################################################################################

"use client";

/* hooks */
import * as React from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useQuery } from "convex/react";

/* components */
import CustomTable from "@/components/ui/custom-table";
import { Separator } from "@/components/ui/separator";
import ProgramDetailInfo from "@/components/program/program-detail-info";
import ProgramDetailActions from "@/components/program/program-detail-actions";
import { courseColumns } from "@/components/course/columns";
import ProgramFormDialog from "@/components/program/program-form-dialog";
import { ProgramDeleteDialog } from "@/components/program/program-delete-dialog";

/* lib */
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { ROUTES } from "@/lib/routes";
import { exportProgramCourses } from "@/lib/programs/utils";

interface ProgramDetailClientProps {
  programId: Id<"programs">;
  initialProgram?: Doc<"programs"> | null;
  initialCourses?: Doc<"courses">[];
  initialCategories?: Doc<"program_categories">[];
}

export default function ProgramDetailClient({
  programId,
  initialProgram,
  initialCourses,
  initialCategories,
}: ProgramDetailClientProps) {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("admin.programs.detail");
  const tTable = useTranslations("admin.programs.table");
  const tCourseForm = useTranslations("admin.courses.form");
  const tExport = useTranslations("admin.programs.export");

  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);

  // Fetch data with real-time updates from Convex
  const programQuery = useQuery(api.programs.getProgramById, { id: programId });
  const coursesQuery = useQuery(api.courses.getCoursesByProgram, {
    programId: programId,
  });
  const categoriesQuery = useQuery(api.programs.getProgramCategories, {});

  const program = programQuery ?? initialProgram ?? null;
  const courses = coursesQuery ?? initialCourses ?? [];
  const categories = categoriesQuery ?? initialCategories ?? [];

  const categoryLabel = React.useMemo(() => {
    if (!program?.categoryId || !categories) return "";
    const category = categories.find((c) => c._id === program.categoryId);
    return category?.name || "";
  }, [program?.categoryId, categories]);

  const columns = React.useMemo(() => {
    // Create a combined translator that handles both table and course form translations
    const combinedTranslator = (key: string, values?: Record<string, any>) => {
      // If the key starts with "options.categories", use course form translations
      if (key.startsWith("options.categories")) {
        return tCourseForm(key, values);
      }
      // Otherwise use table translations
      return tTable(key, values);
    };
    return courseColumns(combinedTranslator, locale);
  }, [locale, tTable, tCourseForm]);

  const handleBack = React.useCallback(() => {
    router.push(ROUTES.programs.root.withLocale(locale));
  }, [router, locale]);

  const handleRowClick = React.useCallback(
    (course: any) => {
      router.push(ROUTES.courses.details(course._id).withLocale(locale));
    },
    [router, locale],
  );

  const handleEdit = React.useCallback(() => {
    setIsEditDialogOpen(true);
  }, []);

  const handleDelete = React.useCallback(() => {
    setIsDeleteDialogOpen(true);
  }, []);

  const handleDeleteSuccess = React.useCallback(() => {
    router.push(ROUTES.programs.root.withLocale(locale));
  }, [router, locale]);

  const handleExport = React.useCallback(
    (rows: Doc<"courses">[]) => {
      if (!program) return;

      exportProgramCourses({
        program,
        courses: rows,
        locale,
        detailTranslator: t,
        tableTranslator: tTable,
        courseFormTranslator: tCourseForm,
        exportTranslator: tExport,
      });
    },
    [program, locale, t, tTable, tCourseForm, tExport],
  );

  if (!program) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  const nameEs = program.nameEs || "";
  const nameEn = program.nameEn || "";
  const programName = locale === "es" ? nameEs || nameEn : nameEn || nameEs;

  const programWithId = { ...program, _id: programId };

  return (
    <>
      <ProgramFormDialog
        mode="edit"
        program={programWithId}
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
      />

      <ProgramDeleteDialog
        programId={programId}
        programName={programName}
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onSuccess={handleDeleteSuccess}
      />

      <ProgramDetailInfo
        program={program}
        categoryLabel={categoryLabel}
        locale={locale}
        onBack={handleBack}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <Separator />

      <ProgramDetailActions programId={programId} />

      <Separator />

      <CustomTable
        columns={columns}
        data={courses}
        filterColumn="name"
        filterPlaceholder={t("filterCoursesPlaceholder")}
        columnsMenuLabel={t("columnsMenuLabel")}
        emptyMessage={t("emptyCoursesMessage")}
        onRowClick={handleRowClick}
        onExport={handleExport}
      />
    </>
  );
}
