"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import type { ColumnDef } from "@tanstack/react-table";
import CustomTable from "@/components/ui/custom-table";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import ClassDetailInfo from "@/components/class/class-detail-info";
import ClassDetailActions from "@/components/class/class-detail-actions";
import { ROUTES } from "@/lib/routes";

export default function ClassDetailPage() {
  const params = useParams();
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("admin.classes.detail");

  const classId = params.classId as Id<"classes">;

  const classData = useQuery(api.classes.getClassById, { id: classId });
  const enrollments = useQuery(api.classes.getClassEnrollments, { classId });

  const handleBack = React.useCallback(() => {
    if (classData?.courseId) {
      router.push(
        ROUTES.courses.details(classData.courseId).withLocale(locale),
      );
    } else {
      router.back();
    }
  }, [router, locale, classData?.courseId]);

  // Define columns for students/grades table
  const studentColumns = React.useMemo<ColumnDef<any>[]>(
    () => [
      {
        accessorKey: "student",
        header: t("table.student"),
        cell: ({ row }) => {
          const student = row.original.student;
          if (!student) return "—";
          return (
            <div className="flex flex-col">
              <span className="font-medium">
                {student.firstName} {student.lastName}
              </span>
              <span className="text-xs text-muted-foreground">
                {student.email}
              </span>
            </div>
          );
        },
      },
      {
        accessorKey: "studentCode",
        header: t("table.studentCode"),
        cell: ({ row }) => {
          const student = row.original.student;
          return student?.studentProfile?.studentCode || "—";
        },
      },
      {
        accessorKey: "status",
        header: t("table.enrollmentStatus"),
        cell: ({ row }) => {
          const status = row.original.status;
          const statusMap: Record<string, any> = {
            enrolled: "default",
            dropped: "secondary",
            withdrawn: "outline",
            completed: "default",
            incomplete: "destructive",
            failed: "destructive",
          };
          const statusVariant = statusMap[status] || "secondary";

          return (
            <Badge variant={statusVariant} className="text-xs">
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
        cell: ({ row }) => {
          const grade = row.original.letterGrade;
          return (
            <div className="text-center font-semibold">{grade || "—"}</div>
          );
        },
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

  // Prepare enrollments data
  const enrollmentsData = React.useMemo(() => {
    return enrollments || [];
  }, [enrollments]);

  if (!classData) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">{t("loading")}</p>
      </div>
    );
  }

  return (
    <>
      <ClassDetailInfo
        classData={classData}
        enrolledCount={enrollmentsData.length}
        locale={locale}
        onBack={handleBack}
      />

      <Separator />

      <ClassDetailActions classId={classId} />

      <Separator />

      <div className="space-y-4">
        <CustomTable
          columns={studentColumns}
          data={enrollmentsData}
          filterColumn="student"
          filterPlaceholder={t("filterStudentsPlaceholder")}
          columnsMenuLabel={t("columnsMenuLabel")}
          emptyMessage={t("emptyStudentsMessage")}
        />
      </div>
    </>
  );
}
