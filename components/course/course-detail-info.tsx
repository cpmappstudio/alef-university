"use client";

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

interface CourseDetailInfoProps {
  course: Doc<"courses">;
  locale: string;
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export default function CourseDetailInfo({
  course,
  locale,
  onBack,
  onEdit,
  onDelete,
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
          <GradientCardDetailItem
            label={t("credits")}
            value={`${course.credits}`}
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
