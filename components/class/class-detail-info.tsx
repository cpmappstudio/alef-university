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
  };
  enrolledCount: number;
  locale: string;
  onBack: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export default function ClassDetailInfo({
  classData,
  enrolledCount,
  locale,
  onBack,
  onEdit,
  onDelete,
}: ClassDetailInfoProps) {
  const t = useTranslations("admin.classes.detail");
  const dateLocale = locale === "es" ? es : enUS;

  const course = classData.course;
  const bimester = classData.bimester;
  const professor = classData.professor;
  const status = classData.status;

  const courseName =
    locale === "es"
      ? course?.nameEs || course?.nameEn || "—"
      : course?.nameEn || course?.nameEs || "—";

  const courseCode =
    locale === "es"
      ? course?.codeEs || course?.codeEn || "—"
      : course?.codeEn || course?.codeEs || "—";

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
    <div className="grid mb-4 gap-4 md:grid-cols-2 lg:grid-cols-4">
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
        <p className="text-sm text-muted-foreground">{t("info.credits")}</p>
        <p className="font-medium">{course?.credits || "—"}</p>
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
