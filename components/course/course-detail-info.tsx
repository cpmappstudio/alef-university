"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import type { Doc } from "@/convex/_generated/dataModel";
import { BookOpen, PencilIcon, Trash2Icon } from "lucide-react";
import {
  GradientCard,
  GradientCardHeader,
  GradientCardContent,
  GradientCardDetailGrid,
  GradientCardDetailItem,
  GradientCardDescriptions,
  GradientCardDescriptionBlock,
} from "@/components/ui/gradient-card";
import { ROUTES } from "@/lib/routes";
import type { CourseProgramSummary } from "@/lib/courses/types";
import { Badge } from "@/components/ui/badge";

interface CourseDetailInfoProps {
  course: Doc<"courses">;
  locale: string;
  onEdit: () => void;
  onDelete: () => void;
  programs?: CourseProgramSummary[];
}

export default function CourseDetailInfo({
  course,
  locale,
  onEdit,
  onDelete,
  programs = [],
}: CourseDetailInfoProps) {
  const t = useTranslations("admin.courses.detail");
  const tTable = useTranslations("admin.courses.table");
  const tForm = useTranslations("admin.courses.form");

  const codeEs = course.codeEs || "";
  const codeEn = course.codeEn || "";
  const nameEs = course.nameEs || "";
  const nameEn = course.nameEn || "";
  const descriptionEs = course.descriptionEs || "";
  const descriptionEn = course.descriptionEn || "";

  const courseName = locale === "es" ? nameEs || nameEn : nameEn || nameEs;
  const courseCode = locale === "es" ? codeEs || codeEn : codeEn || codeEs;

  const categoryLabels = {
    humanities: tForm("options.categories.humanities"),
    core: tForm("options.categories.core"),
    elective: tForm("options.categories.elective"),
    general: tForm("options.categories.general"),
  };

  const languageLabels = {
    es: tTable("languages.es"),
    en: tTable("languages.en"),
    both: tTable("languages.both"),
  };
  const hasPrograms = programs.length > 0;

  const actions = (
    <>
      <Button size="sm" onClick={onEdit} className="cursor-pointer">
        <span className="hidden md:inline">{t("edit")}</span>
        <PencilIcon className="h-4 w-4 md:ml-2" />
      </Button>
      <Button
        variant="destructive"
        size="sm"
        onClick={onDelete}
        className="cursor-pointer"
      >
        <span className="hidden md:inline">{t("delete")}</span>
        <Trash2Icon className="h-4 w-4 md:ml-2" />
      </Button>
    </>
  );

  return (
    <GradientCard>
      <GradientCardHeader
        icon={<BookOpen className="size-6" />}
        title={courseName}
        actions={actions}
      />

      <GradientCardContent>
        <GradientCardDetailGrid>
          {/* Primary Information */}
          <GradientCardDetailItem
            label={t("category")}
            value={categoryLabels[course.category]}
          />
          <GradientCardDetailItem
            label={t("language")}
            value={languageLabels[course.language]}
          />

          {/* Status */}
          <GradientCardDetailItem
            label={t("status")}
            value={
              course.isActive
                ? tTable("status.active")
                : tTable("status.inactive")
            }
          />

          {/* Bilingual Codes */}
          {codeEs && (
            <GradientCardDetailItem label={t("codeEs")} value={codeEs} />
          )}
          {codeEn && codeEs !== codeEn && (
            <GradientCardDetailItem label={t("codeEn")} value={codeEn} />
          )}

          {/* Bilingual Names */}
          {nameEs && (
            <GradientCardDetailItem label={t("nameEs")} value={nameEs} />
          )}
          {nameEn && nameEs !== nameEn && (
            <GradientCardDetailItem label={t("nameEn")} value={nameEn} />
          )}

          {/* Timestamps */}
          <GradientCardDetailItem
            label={t("createdAt")}
            value={new Date(course.createdAt).toLocaleDateString(
              locale === "es" ? "es-ES" : "en-US",
              {
                year: "numeric",
                month: "short",
                day: "numeric",
              },
            )}
          />
          {course.updatedAt && (
            <GradientCardDetailItem
              label={t("updatedAt")}
              value={new Date(course.updatedAt).toLocaleDateString(
                locale === "es" ? "es-ES" : "en-US",
                {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                },
              )}
            />
          )}
        </GradientCardDetailGrid>

        {hasPrograms && (
          <div className="mt-6 pt-6 border-t border-white/20">
            <h3 className="text-sm font-semibold text-white/90 mb-3">
              {t("programs")}
            </h3>
            <div className="flex flex-wrap gap-2">
              {programs.map((program) => {
                const programName =
                  locale === "es"
                    ? program.nameEs || program.nameEn || "-"
                    : program.nameEn || program.nameEs || "-";
                const programCode =
                  locale === "es"
                    ? program.codeEs || program.codeEn || ""
                    : program.codeEn || program.codeEs || "";
                const href = ROUTES.programs
                  .details(program._id)
                  .withLocale(locale);
                const credits = program.credits;

                return (
                  <Link
                    key={program._id}
                    href={href}
                    className="inline-flex items-center gap-2 rounded-full border border-white/40 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-white/10"
                  >
                    <span>{programName}</span>
                    {programCode && (
                      <span className="text-xs text-white/70">
                        {programCode}
                      </span>
                    )}
                    {credits !== undefined && (
                      <Badge
                        variant="outline"
                        className="ml-1 rounded-full text-xs text-white border-white/40"
                      >
                        {credits} {locale === "es" ? "créditos" : "credits"}
                      </Badge>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Descriptions Section */}
        {(descriptionEs || descriptionEn) && (
          <GradientCardDescriptions>
            {descriptionEs && (
              <GradientCardDescriptionBlock
                label={t("descriptionEs")}
                content={descriptionEs}
              />
            )}
            {descriptionEn && (
              <GradientCardDescriptionBlock
                label={t("descriptionEn")}
                content={descriptionEn}
              />
            )}
          </GradientCardDescriptions>
        )}
      </GradientCardContent>
    </GradientCard>
  );
}
