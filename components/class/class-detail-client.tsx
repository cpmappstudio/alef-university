"use client";

/* hooks */
import * as React from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useQuery } from "convex/react";

/* components */
import CustomTable from "@/components/ui/custom-table";
import { Separator } from "@/components/ui/separator";
import ClassDetailInfo from "@/components/class/class-detail-info";
import ClassDetailActions from "@/components/class/class-detail-actions";
import { ClassDeleteDialog } from "@/components/class/class-delete-dialog";
import ClassFormDialog from "@/components/class/class-form-dialog";
import { classEnrollmentColumns } from "@/components/class/columns";

/* lib */
import { api } from "@/convex/_generated/api";
import { ROUTES } from "@/lib/routes";
import type {
  ClassDetailClientProps,
  ClassEnrollmentRow,
  ClassWithRelations,
} from "@/lib/classes/types";

export function ClassDetailClient({
  classId,
  initialClass,
  initialEnrollments,
}: ClassDetailClientProps) {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("admin.classes.detail");
  const tTable = useTranslations("admin.classes.detail.table");

  const classQuery = useQuery(api.classes.getClassById, { id: classId });
  const enrollmentsQuery = useQuery(api.classes.getClassEnrollments, {
    classId,
  });

  const classData = classQuery ?? initialClass ?? null;
  const enrollments =
    (enrollmentsQuery as ClassEnrollmentRow[] | undefined) ??
    initialEnrollments ??
    [];

  const [editDialogOpen, setEditDialogOpen] = React.useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);

  const handleBack = React.useCallback(() => {
    if (classData?.courseId) {
      router.push(
        ROUTES.courses.details(classData.courseId).withLocale(locale),
      );
      return;
    }
    router.back();
  }, [router, locale, classData?.courseId]);

  const handleEdit = React.useCallback(() => {
    setEditDialogOpen(true);
  }, []);

  const handleDelete = React.useCallback(() => {
    setDeleteDialogOpen(true);
  }, []);

  const handleDeleteSuccess = React.useCallback(() => {
    if (classData?.courseId) {
      router.push(
        ROUTES.courses.details(classData.courseId).withLocale(locale),
      );
    } else {
      router.push(ROUTES.classes.root.withLocale(locale));
    }
  }, [router, locale, classData?.courseId]);

  const studentColumns = React.useMemo(
    () => classEnrollmentColumns(tTable),
    [tTable],
  );

  if (!classData) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">{t("loading")}</p>
      </div>
    );
  }

  const normalizedClass: ClassWithRelations = {
    ...classData,
    course: classData.course ?? null,
    bimester: classData.bimester ?? null,
    professor: classData.professor ?? null,
  };

  const courseName =
    locale === "es"
      ? normalizedClass.course?.nameEs ||
        normalizedClass.course?.nameEn ||
        "Class"
      : normalizedClass.course?.nameEn ||
        normalizedClass.course?.nameEs ||
        "Class";
  const className = `${courseName} - ${t("info.group")} ${normalizedClass.groupNumber}`;

  return (
    <>
      <ClassDetailInfo
        classData={normalizedClass}
        enrolledCount={enrollments.length}
        locale={locale}
        onBack={handleBack}
      />

      <Separator />

      <ClassDetailActions
        classId={classId}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <Separator />

      <CustomTable
        columns={studentColumns}
        data={enrollments}
        filterColumn="student"
        filterPlaceholder={t("filterStudentsPlaceholder")}
        columnsMenuLabel={t("columnsMenuLabel")}
        emptyMessage={t("emptyStudentsMessage")}
      />

      {classData?.courseId && (
        <ClassFormDialog
          mode="edit"
          courseId={classData.courseId}
          classId={classId}
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
        />
      )}

      <ClassDeleteDialog
        classId={classId}
        className={className}
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onSuccess={handleDeleteSuccess}
      />
    </>
  );
}
