"use client";

/* hooks */
import * as React from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useQuery } from "convex/react";

/* components */
import CustomTable from "@/components/ui/custom-table";
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
import type { CourseClassRow } from "@/lib/courses/types";

interface CourseDetailClientProps {
  courseId: Id<"courses">;
  initialCourse?: Doc<"courses"> | null;
  initialClasses?: CourseClassRow[];
}

export function CourseDetailClient({
  courseId,
  initialCourse,
  initialClasses,
}: CourseDetailClientProps) {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("admin.courses.detail");

  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);

  const courseQuery = useQuery(api.courses.getCourseById, { id: courseId });
  const classesQuery = useQuery(api.classes.getClassesByCourse, { courseId });

  const course = courseQuery ?? initialCourse ?? null;
  const classes =
    (classesQuery as CourseClassRow[] | undefined) ?? initialClasses ?? [];

  const handleBack = React.useCallback(() => {
    router.push(ROUTES.courses.root.withLocale(locale));
  }, [router, locale]);

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
        accessorKey: "groupNumber",
        header: t("table.group"),
        cell: ({ row }) => (
          <span className="font-medium">
            {t("table.groupPrefix")} {row.original.groupNumber}
          </span>
        ),
      },
      {
        accessorKey: "bimester",
        header: t("table.bimester"),
        cell: ({ row }) => {
          const bimester = row.original.bimester;
          if (!bimester?.startDate || !bimester?.endDate) return "-";
          return (
            <div className="flex flex-col text-xs sm:text-sm">
              <span className="whitespace-nowrap">
                {format(new Date(bimester.startDate), "PP", {
                  locale: dateLocale,
                })}
              </span>
              <span className="text-muted-foreground whitespace-nowrap">
                {format(new Date(bimester.endDate), "PP", {
                  locale: dateLocale,
                })}
              </span>
            </div>
          );
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
    [t, dateLocale],
  );

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
        onBack={handleBack}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      {/*<Separator />*/}

      <CourseDetailActions courseId={courseId} />

      <Separator />

      <CustomTable
        columns={classColumns}
        data={classes}
        filterColumn="groupNumber"
        filterPlaceholder={t("filterClassesPlaceholder")}
        columnsMenuLabel={t("columnsMenuLabel")}
        emptyMessage={t("emptyClassesMessage")}
        onRowClick={handleRowClick}
      />
    </>
  );
}
