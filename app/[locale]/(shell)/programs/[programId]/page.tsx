"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import CustomTable from "@/components/ui/custom-table";
import { Separator } from "@/components/ui/separator";
import ProgramDetailInfo from "@/components/program/program-detail-info";
import ProgramDetailActions from "@/components/course/program-detail-actions";
import { courseColumns } from "@/components/course/columns";
import ProgramFormDialog from "@/components/program/program-form-dialog";
import { ProgramDeleteDialog } from "@/components/program/program-delete-dialog";

import { exportProgramsToPDF } from "@/lib/export-programs-pdf";

export default function ProgramDetailPage() {
  const params = useParams();
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("admin.programs.detail");
  const tTable = useTranslations("admin.programs.table");
  const tCourseForm = useTranslations("admin.courses.form");
  const tExport = useTranslations("admin.programs.export");

  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);

  const programId = params.programId as Id<"programs">;

  const program = useQuery(api.programs.getProgramById, { id: programId });
  const courses = useQuery(api.courses.getCoursesByProgram, {
    programId: programId,
  });
  const categories = useQuery(api.programs.getProgramCategories, {});

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
    router.push(`/${locale}/admin/programs`);
  }, [router, locale]);

  const handleRowClick = React.useCallback(
    (course: any) => {
      router.push(`/${locale}/admin/courses/${course._id}`);
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
    router.push(`/${locale}/admin/programs`);
  }, [router, locale]);

  const handleExport = React.useCallback(
    (rows: Doc<"courses">[]) => {
      if (!program) return;

      const nameEs = program.nameEs || "";
      const nameEn = program.nameEn || "";
      const programName = locale === "es" ? nameEs || nameEn : nameEn || nameEs;

      // Crear traducciones para categorías
      const categoryLabels: Record<string, string> = {
        humanities: tCourseForm("options.categories.humanities"),
        core: tCourseForm("options.categories.core"),
        elective: tCourseForm("options.categories.elective"),
        general: tCourseForm("options.categories.general"),
      };

      // Convertir cursos a formato similar a programas para reutilizar la función
      const coursesAsPrograms = rows.map((course) => ({
        _id: course._id,
        _creationTime: course._creationTime,
        codeEs: course.codeEs,
        codeEn: course.codeEn,
        nameEs: course.nameEs,
        nameEn: course.nameEn,
        descriptionEs: course.descriptionEs,
        descriptionEn: course.descriptionEn,
        type: course.category as any, // Usamos category como type
        language: course.language,
        categoryId: undefined,
        totalCredits: course.credits,
        durationBimesters: undefined,
        isActive: course.isActive,
        createdAt: course.createdAt,
      })) as any;

      exportProgramsToPDF({
        programs: coursesAsPrograms,
        categoryLabels: categoryLabels,
        locale,
        translations: {
          title: `${programName} - ${t("courses")}`,
          generatedOn: tExport("generatedOn"),
          totalPrograms: `${rows.length} ${t("totalCourses")}`,
          page: tExport("page"),
          of: tExport("of"),
          columns: {
            code: tTable("columns.code"),
            program: tTable("columns.course"),
            type: tTable("columns.category"),
            category: tTable("columns.emptyValue"),
            language: tTable("columns.language"),
            credits: tTable("columns.credits"),
            duration: tTable("columns.emptyValue"),
            status: tTable("columns.status"),
          },
          types: {
            humanities: categoryLabels.humanities,
            core: categoryLabels.core,
            elective: categoryLabels.elective,
            general: categoryLabels.general,
          } as any,
          languages: {
            es: tTable("languages.es"),
            en: tTable("languages.en"),
            both: tTable("languages.both"),
          },
          status: {
            active: tTable("status.active"),
            inactive: tTable("status.inactive"),
          },
          emptyValue: tTable("columns.emptyValue"),
        },
      });
    },
    [program, locale, t, tExport, tTable, tCourseForm],
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

  const programWithId = program ? { ...program, _id: programId } : null;

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
