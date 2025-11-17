"use client";

import * as React from "react";
import { useTranslations, useLocale } from "next-intl";
import { Button } from "@/components/ui/button";
import type { Doc } from "@/convex/_generated/dataModel";
import { GraduationCap, PencilIcon, Trash2Icon, UserRound } from "lucide-react";
import Link from "next/link";
import {
  GradientCard,
  GradientCardContent,
  GradientCardDetailGrid,
  GradientCardDetailItem,
  GradientCardHeader,
} from "@/components/ui/gradient-card";
import type { StudentDocument } from "@/lib/students/types";
import { ROUTES } from "@/lib/routes";

interface StudentDetailInfoProps {
  student: StudentDocument;
  program?: Doc<"programs"> | null;
  onEdit?: () => void;
  onDelete?: () => void;
  canDelete?: boolean;
  userRole?: string | null;
}

export function StudentDetailInfo({
  student,
  program,
  onEdit,
  onDelete,
  canDelete = true,
  userRole,
}: StudentDetailInfoProps) {
  const t = useTranslations("admin.students.detail");
  const tTable = useTranslations("admin.students.table");
  const locale = useLocale();

  const fullName = `${student.firstName ?? ""} ${student.lastName ?? ""}`
    .trim()
    .replace(/\s+/g, " ");
  const displayName = fullName || student.email;

  const statusLabel = student.isActive
    ? tTable("status.active")
    : tTable("status.inactive");

  const programName = program
    ? locale === "es"
      ? program.nameEs || program.nameEn || ""
      : program.nameEn || program.nameEs || ""
    : null;

  const actions = (
    <>
      {onEdit && (
        <Button size="sm" onClick={onEdit} className="cursor-pointer">
          <span className="hidden md:inline">{t("edit")}</span>
          <PencilIcon className="h-4 w-4 md:ml-2" />
        </Button>
      )}
      {canDelete && onDelete && (
        <Button
          variant="destructive"
          size="sm"
          onClick={onDelete}
          className="cursor-pointer"
        >
          <span className="hidden md:inline">{t("delete")}</span>
          <Trash2Icon className="h-4 w-4 md:ml-2" />
        </Button>
      )}
    </>
  );

  return (
    <GradientCard>
      <GradientCardHeader
        icon={<UserRound className="size-6" />}
        title={displayName}
        actions={actions}
      />
      <GradientCardContent>
        <GradientCardDetailGrid>
          <GradientCardDetailItem
            label={t("info.fullName")}
            value={displayName}
          />
          <GradientCardDetailItem
            label={t("contact.email")}
            value={student.email ?? "—"}
          />
          <GradientCardDetailItem
            label={t("contact.phone")}
            value={
              student.phone && student.phone.trim() !== "" ? student.phone : "—"
            }
          />
          <GradientCardDetailItem
            label={t("info.status")}
            value={statusLabel}
          />
          <GradientCardDetailItem
            label={t("info.studentCode")}
            value={student.studentProfile?.studentCode ?? "—"}
          />
          <GradientCardDetailItem
            label={t("contact.country")}
            value={
              student.country && student.country.trim() !== ""
                ? student.country
                : "—"
            }
          />
          <GradientCardDetailItem
            label={t("info.program")}
            value={
              programName ? (
                userRole === "student" ? (
                  <span className="inline-flex items-center gap-1 text-white">
                    <GraduationCap className="h-3 w-3" />
                    {programName}
                  </span>
                ) : (
                  <Link
                    href={ROUTES.programs
                      .details(program!._id)
                      .withLocale(locale)}
                    className="inline-flex items-center gap-1 text-white underline decoration-white/60"
                  >
                    <GraduationCap className="h-3 w-3" />
                    {programName}
                  </Link>
                )
              ) : (
                "—"
              )
            }
          />
        </GradientCardDetailGrid>
      </GradientCardContent>
    </GradientCard>
  );
}
