"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import type { Doc } from "@/convex/_generated/dataModel";
import { format } from "date-fns";
import { es, enUS } from "date-fns/locale";

interface ClassDetailInfoProps {
  classData: {
    _id: string;
    groupNumber: string;
    status: "open" | "active" | "grading" | "completed";
    course: Doc<"courses"> | null;
    bimester: Doc<"bimesters"> | null;
    professor: Doc<"users"> | null;
    program?: Doc<"programs"> | null;
    credits?: number;
  };
  enrolledCount: number;
  locale: string;
  onBack: () => void;
}

export default function ClassDetailInfo({
  classData,
  enrolledCount,
  locale,
  onBack,
}: ClassDetailInfoProps) {
  const t = useTranslations("admin.classes.detail");
  const dateLocale = locale === "es" ? es : enUS;

  const course = classData.course;
  const bimester = classData.bimester;
  const professor = classData.professor;
  const program = classData.program;
  const status = classData.status;

  const courseName =
    locale === "es"
      ? course?.nameEs || course?.nameEn || "—"
      : course?.nameEn || course?.nameEs || "—";

  const courseCode =
    locale === "es"
      ? course?.codeEs || course?.codeEn || "—"
      : course?.codeEn || course?.codeEs || "—";

  const programName =
    locale === "es"
      ? program?.nameEs || program?.nameEn
      : program?.nameEn || program?.nameEs;

  const programCode =
    locale === "es"
      ? program?.codeEs || program?.codeEn
      : program?.codeEn || program?.codeEs;

  const statusMap: Record<string, any> = {
    draft: "secondary",
    open: "default",
    closed: "outline",
    active: "default",
    grading: "secondary",
    completed: "outline",
  };
  const statusVariant = statusMap[status] || "secondary";

  return (
    <div className="grid mb-4 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      <div className="space-y-1">
        <p className="text-sm text-muted-foreground">{t("info.course")}</p>
        <p className="font-medium">{courseName}</p>
        <p className="text-xs text-muted-foreground">{courseCode}</p>
      </div>

      <div className="space-y-1">
        <p className="text-sm text-muted-foreground">{t("info.professor")}</p>
        <p className="font-medium">
          {professor ? `${professor.firstName} ${professor.lastName}` : "—"}
        </p>
        <p className="text-xs text-muted-foreground">
          {professor?.email || ""}
        </p>
      </div>

      <div className="space-y-1">
        <p className="text-sm text-muted-foreground">{t("info.bimester")}</p>
        <p className="font-medium">{bimester?.name || "—"}</p>
        <p className="text-xs text-muted-foreground">
          {bimester
            ? `${format(new Date(bimester.startDate), "P", { locale: dateLocale })} - ${format(new Date(bimester.endDate), "P", { locale: dateLocale })}`
            : ""}
        </p>
        {bimester?.isActive && (
          <p className="text-xs text-muted-foreground">{t("info.active")}</p>
        )}
      </div>

      <div className="space-y-1">
        <p className="text-sm text-muted-foreground">
          {t("info.gradingDates")}
        </p>
        <p className="font-medium">
          {bimester
            ? `${format(new Date(bimester.endDate), "P", { locale: dateLocale })} - ${format(new Date(bimester.gradeDeadline), "P", { locale: dateLocale })}`
            : "—"}
        </p>
      </div>

      <div className="space-y-1">
        <p className="text-sm text-muted-foreground">{t("info.program")}</p>
        <p className="font-medium">{programName || "—"}</p>
        {programCode && (
          <p className="text-xs text-muted-foreground">{programCode}</p>
        )}
      </div>

      <div className="space-y-1">
        <p className="text-sm text-muted-foreground">{t("info.credits")}</p>
        <p className="font-medium">{classData.credits ?? "—"}</p>
      </div>

      <div className="space-y-1">
        <p className="text-sm text-muted-foreground">
          {t("info.enrolledStudents")}
        </p>
        <p className="font-medium">{enrolledCount}</p>
      </div>
    </div>
  );
}
