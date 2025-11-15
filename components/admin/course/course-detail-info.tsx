"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import type { Doc } from "@/convex/_generated/dataModel";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ArrowLeft, BookOpen, PencilIcon, Trash2Icon } from "lucide-react";

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

  return (
    <Card className="overflow-hidden  bg-[radial-gradient(circle_at_top_right,_var(--color-fuzzy-wuzzy)_0%,_var(--color-deep-koamaru)_50%)] text-white border-0 shadow-lg">
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          {/* Course Information */}
          <CardTitle className="flex items-center gap-3 text-xl mb-2">
            <BookOpen className="size-6 flex-shrink-0" />
            <span className="truncate text-pretty">{courseName}</span>
          </CardTitle>

          {/* Action Buttons */}
          <CardAction className="flex gap-2">
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
          </CardAction>
        </div>
      </CardHeader>

      {/* Course Details Grid */}
      <CardContent className="pt-0">
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {/* Primary Information */}
          <CourseDetailItem
            label={t("category")}
            value={categoryLabels[course.category]}
          />
          <CourseDetailItem
            label={t("language")}
            value={languageLabels[course.language]}
          />
          <CourseDetailItem label={t("credits")} value={`${course.credits}`} />

          {/* Status */}
          <CourseDetailItem
            label={t("status")}
            value={
              course.isActive
                ? tTable("status.active")
                : tTable("status.inactive")
            }
          />

          {/* Bilingual Codes */}
          {codeEs && <CourseDetailItem label={t("codeEs")} value={codeEs} />}
          {codeEn && codeEs !== codeEn && (
            <CourseDetailItem label={t("codeEn")} value={codeEn} />
          )}

          {/* Bilingual Names */}
          {nameEs && <CourseDetailItem label={t("nameEs")} value={nameEs} />}
          {nameEn && nameEs !== nameEn && (
            <CourseDetailItem label={t("nameEn")} value={nameEn} />
          )}

          {/* Timestamps */}
          <CourseDetailItem
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
            <CourseDetailItem
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
        </div>

        {/* Descriptions Section */}
        {(descriptionEs || descriptionEn) && (
          <div className="mt-6 pt-6 border-t border-white/20 space-y-4">
            {descriptionEs && (
              <div>
                <div className="text-sm font-medium text-white/70 mb-1">
                  {t("descriptionEs")}
                </div>
                <div className="text-sm leading-relaxed">{descriptionEs}</div>
              </div>
            )}
            {descriptionEn && (
              <div>
                <div className="text-sm font-medium text-white/70 mb-1">
                  {t("descriptionEn")}
                </div>
                <div className="text-sm leading-relaxed">{descriptionEn}</div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Individual detail item component for the grid
 */
interface CourseDetailItemProps {
  label: string;
  value: string;
}

function CourseDetailItem({ label, value }: CourseDetailItemProps) {
  return (
    <div>
      <div className="text-sm font-medium text-white/70">{label}</div>
      <div className="text-base font-semibold">{value}</div>
    </div>
  );
}
