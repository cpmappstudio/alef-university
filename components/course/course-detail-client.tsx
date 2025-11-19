"use client";

/* hooks */
import * as React from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useQuery } from "convex/react";

/* components */
import CustomTable from "@/components/table/custom-table";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import CourseDetailInfo from "@/components/course/course-detail-info";
import CourseDetailActions from "@/components/course/course-detail-actions";
import { CourseFormDialog } from "@/components/course/course-form-dialog";
import { CourseDeleteDialog } from "@/components/course/course-delete-dialog";

/* lib */
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { ROUTES } from "@/lib/routes";
import { format } from "date-fns";
import { es, enUS } from "date-fns/locale";
import type { ColumnDef } from "@tanstack/react-table";
import type { CourseClassRow, CourseProgramSummary } from "@/lib/courses/types";
import { createMultiSelectFilterFn } from "@/lib/table/filter-configs";

interface CourseDetailClientProps {
  courseId: Id<"courses">;
  initialCourse?: Doc<"courses"> | null;
  initialClasses?: CourseClassRow[];
  initialPrograms?: CourseProgramSummary[];
}

export function CourseDetailClient({
  courseId,
  initialCourse,
  initialClasses,
  initialPrograms,
}: CourseDetailClientProps) {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("admin.courses.detail");

  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);

  const courseQuery = useQuery(api.courses.getCourseById, { id: courseId });
  const classesQuery = useQuery(api.classes.getClassesByCourse, { courseId });
  const programsQuery = useQuery(api.programs.getProgramsByCourse, {
    courseId,
  });

  const course = courseQuery ?? initialCourse ?? null;
  const classes =
    (classesQuery as CourseClassRow[] | undefined) ?? initialClasses ?? [];
  const programs =
    (programsQuery as CourseProgramSummary[] | undefined) ??
    initialPrograms ??
    [];

  const handleEdit = React.useCallback(() => {
    setIsEditDialogOpen(true);
  }, []);

  const handleDelete = React.useCallback(() => {
    setIsDeleteDialogOpen(true);
  }, []);

  const handleDeleteSuccess = React.useCallback(() => {
    router.push(ROUTES.courses.root.withLocale(locale));
  }, [router, locale]);

  const handleRowClick = React.useCallback(
    (classItem: CourseClassRow) => {
      router.push(ROUTES.classes.details(classItem._id).withLocale(locale));
    },
    [router, locale],
  );

  const dateLocale = locale === "es" ? es : enUS;

  const classColumns = React.useMemo<ColumnDef<CourseClassRow>[]>(
    () => [
      {
        id: "search",
        accessorFn: (row) => {
          // Program name and code
          const program = row.program;
          const programName = program
            ? locale === "es"
              ? program.nameEs || program.nameEn
              : program.nameEn || program.nameEs
            : "";
          const programCode = program
            ? locale === "es"
              ? program.codeEs || program.codeEn
              : program.codeEn || program.codeEs
            : "";

          // Bimester name
          const bimesterName = row.bimester?.name || "";

          // Professor name
          const professor = row.professor;
          const professorName = professor
            ? [professor.firstName, professor.lastName]
                .filter(Boolean)
                .join(" ")
                .trim()
            : "";

          // Combine all searchable fields
          return `${programName} ${programCode} ${bimesterName} ${professorName}`
            .toLowerCase()
            .trim();
        },
        enableHiding: false,
        enableSorting: false,
        enableColumnFilter: true,
        meta: {
          filterOnly: true,
        },
      },
      {
        accessorKey: "groupNumber",
        header: t("table.group"),
        cell: ({ row }) => (
          <span className="font-medium">
            {t("table.groupPrefix")} {row.original.groupNumber}
          </span>
        ),
      },
      {
        accessorKey: "program",
        header: t("table.program"),
        cell: ({ row }) => {
          const program = row.original.program;
          if (!program) return "-";
          const programName =
            locale === "es"
              ? program.nameEs || program.nameEn
              : program.nameEn || program.nameEs;
          const programCode =
            locale === "es"
              ? program.codeEs || program.codeEn
              : program.codeEn || program.codeEs;
          return (
            <div className="flex flex-col text-xs sm:text-sm">
              <span className="font-medium">{programName || "-"}</span>
              {programCode && (
                <span className="text-muted-foreground text-xs">
                  {programCode}
                </span>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: "bimester",
        header: t("table.bimester"),
        cell: ({ row }) => {
          const bimester = row.original.bimester;
          if (!bimester?.name) return "-";
          return <span className="text-xs sm:text-sm">{bimester.name}</span>;
        },
      },
      {
        accessorKey: "professor",
        header: t("table.professor"),
        cell: ({ row }) => {
          const professor = row.original.professor;
          if (!professor) return "-";
          const fullName = [professor.firstName, professor.lastName]
            .filter(Boolean)
            .join(" ")
            .trim();
          return fullName || professor.email || "-";
        },
      },
      {
        accessorKey: "enrolledCount",
        header: t("table.students"),
        cell: ({ row }) => (
          <span className="text-center block">
            {row.original.enrolledCount ?? 0}
          </span>
        ),
      },
      {
        accessorKey: "status",
        header: t("table.status"),
        filterFn: createMultiSelectFilterFn(),
        cell: ({ row }) => {
          const status = row.original.status || "draft";
          const statusMap: Record<string, "secondary" | "default" | "outline"> =
            {
              draft: "secondary",
              open: "default",
              closed: "outline",
              active: "default",
              grading: "secondary",
              completed: "outline",
            };

          const variant = statusMap[status] ?? "secondary";

          return (
            <Badge variant={variant} className="text-xs">
              {t(`table.statusValues.${status}`)}
            </Badge>
          );
        },
      },
    ],
    [t, dateLocale, locale],
  );

  const filterConfigs = React.useMemo(() => {
    return [
      {
        id: "status",
        label: t("filters.status"),
        type: "multi" as const,
        options: [
          { value: "draft", label: t("table.statusValues.draft") },
          { value: "open", label: t("table.statusValues.open") },
          { value: "active", label: t("table.statusValues.active") },
          { value: "grading", label: t("table.statusValues.grading") },
          { value: "completed", label: t("table.statusValues.completed") },
        ],
      },
    ];
  }, [t]);

  if (!course) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">{t("loading")}</p>
      </div>
    );
  }

  const nameEs = course.nameEs || "";
  const nameEn = course.nameEn || "";
  const courseName = locale === "es" ? nameEs || nameEn : nameEn || nameEs;
  const courseWithId = { ...course, _id: courseId };

  return (
    <>
      <CourseFormDialog
        mode="edit"
        course={courseWithId}
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
      />

      <CourseDeleteDialog
        courseId={courseId}
        courseName={courseName}
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onSuccess={handleDeleteSuccess}
      />

      <CourseDetailInfo
        course={course}
        locale={locale}
        onEdit={handleEdit}
        onDelete={handleDelete}
        programs={programs}
      />

      {/*<Separator />*/}

      <CourseDetailActions courseId={courseId} />

      <Separator />

      <CustomTable
        columns={classColumns}
        data={classes}
        filterColumn="search"
        filterPlaceholder={t("filterClassesPlaceholder")}
        columnsMenuLabel={t("columnsMenuLabel")}
        filterConfigs={filterConfigs}
        filtersMenuLabel={t("filters.title") || "Filters"}
        emptyMessage={t("emptyClassesMessage")}
        onRowClick={handleRowClick}
      />
    </>
  );
}
