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
import ClassDetailInfo from "@/components/class/class-detail-info";
import ClassDetailActions from "@/components/class/class-detail-actions";

/* lib */
import { api } from "@/convex/_generated/api";
import { ROUTES } from "@/lib/routes";
import type {
  ClassDetailClientProps,
  ClassEnrollmentRow,
  ClassWithRelations,
} from "@/lib/classes/types";
import type { ColumnDef } from "@tanstack/react-table";

export function ClassDetailClient({
  classId,
  initialClass,
  initialEnrollments,
}: ClassDetailClientProps) {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("admin.classes.detail");

  const classQuery = useQuery(api.classes.getClassById, { id: classId });
  const enrollmentsQuery = useQuery(api.classes.getClassEnrollments, {
    classId,
  });

  const classData = classQuery ?? initialClass ?? null;
  const enrollments =
    (enrollmentsQuery as ClassEnrollmentRow[] | undefined) ??
    initialEnrollments ??
    [];

  const handleBack = React.useCallback(() => {
    if (classData?.courseId) {
      router.push(
        ROUTES.courses.details(classData.courseId).withLocale(locale),
      );
      return;
    }
    router.back();
  }, [router, locale, classData?.courseId]);

  const studentColumns = React.useMemo<ColumnDef<ClassEnrollmentRow>[]>(
    () => [
      {
        accessorKey: "student",
        header: t("table.student"),
        cell: ({ row }) => {
          const student = row.original.student;
          if (!student) return "—";

          const fullName = [student.firstName, student.lastName]
            .filter(Boolean)
            .join(" ")
            .trim();

          return (
            <div className="flex flex-col">
              <span className="font-medium">{fullName || "-"}</span>
              <span className="text-xs text-muted-foreground">
                {student.email ?? ""}
              </span>
            </div>
          );
        },
      },
      {
        accessorKey: "studentCode",
        header: t("table.studentCode"),
        cell: ({ row }) =>
          row.original.student?.studentProfile?.studentCode ?? "—",
      },
      {
        accessorKey: "status",
        header: t("table.enrollmentStatus"),
        cell: ({ row }) => {
          const status = row.original.status ?? "enrolled";
          const variants: Record<
            string,
            "default" | "secondary" | "outline" | "destructive"
          > = {
            enrolled: "default",
            dropped: "secondary",
            withdrawn: "outline",
            completed: "default",
            incomplete: "destructive",
            failed: "destructive",
          };

          return (
            <Badge
              variant={variants[status] ?? "secondary"}
              className="text-xs"
            >
              {t(`table.enrollmentStatusValues.${status}`)}
            </Badge>
          );
        },
      },
      {
        accessorKey: "percentageGrade",
        header: () => (
          <div className="text-right">{t("table.percentageGrade")}</div>
        ),
        cell: ({ row }) => {
          const grade = row.original.percentageGrade;
          return (
            <div className="text-right font-mono">
              {grade !== undefined && grade !== null ? `${grade}%` : "—"}
            </div>
          );
        },
      },
      {
        accessorKey: "letterGrade",
        header: () => (
          <div className="text-center">{t("table.letterGrade")}</div>
        ),
        cell: ({ row }) => (
          <div className="text-center font-semibold">
            {row.original.letterGrade ?? "—"}
          </div>
        ),
      },
      {
        accessorKey: "gradePoints",
        header: () => (
          <div className="text-right">{t("table.gradePoints")}</div>
        ),
        cell: ({ row }) => {
          const points = row.original.gradePoints;
          return (
            <div className="text-right font-mono">
              {points !== undefined && points !== null
                ? points.toFixed(2)
                : "—"}
            </div>
          );
        },
      },
    ],
    [t],
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

  return (
    <>
      <ClassDetailInfo
        classData={normalizedClass}
        enrolledCount={enrollments.length}
        locale={locale}
        onBack={handleBack}
      />

      <Separator />

      <ClassDetailActions classId={classId} />

      <Separator />

      <CustomTable
        columns={studentColumns}
        data={enrollments}
        filterColumn="student"
        filterPlaceholder={t("filterStudentsPlaceholder")}
        columnsMenuLabel={t("columnsMenuLabel")}
        emptyMessage={t("emptyStudentsMessage")}
      />
    </>
  );
}
