"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

import type { Doc } from "@/convex/_generated/dataModel";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ArrowLeft, GraduationCap, PencilIcon, Trash2Icon } from "lucide-react";

interface ProgramDetailInfoProps {
  program: Doc<"programs">;
  categoryLabel: string;
  locale: string;
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export default function ProgramDetailInfo({
  program,
  categoryLabel,
  locale,
  onBack,
  onEdit,
  onDelete,
}: ProgramDetailInfoProps) {
  const t = useTranslations("admin.programs.detail");
  const tTable = useTranslations("admin.programs.table");

  const codeEs = program.codeEs || "";
  const codeEn = program.codeEn || "";
  const nameEs = program.nameEs || "";
  const nameEn = program.nameEn || "";
  const descriptionEs = program.descriptionEs || "";
  const descriptionEn = program.descriptionEn || "";

  const programName = locale === "es" ? nameEs || nameEn : nameEn || nameEs;
  const programCode = locale === "es" ? codeEs || codeEn : codeEn || codeEs;

  const typeLabels = {
    diploma: tTable("types.diploma"),
    bachelor: tTable("types.bachelor"),
    master: tTable("types.master"),
    doctorate: tTable("types.doctorate"),
  };

  const languageLabels = {
    es: tTable("languages.es"),
    en: tTable("languages.en"),
    both: tTable("languages.both"),
  };

  return (
    <>
      <Card className="bg-[radial-gradient(circle_at_top_right,_var(--color-fuzzy-wuzzy)_0%,_var(--color-deep-koamaru)_50%)] text-white border-0 shadow-lg">
        <CardHeader className="pb-4 flex flex-col justify-between md:flex-row">
          {/* Program Information */}
          <CardTitle className="flex items-center gap-3 text-xl mb-2">
            <GraduationCap className="size-6 flex-shrink-0" />
            <span className="truncate">{programName}</span>
          </CardTitle>
          <CardAction className="flex gap-2 ">
            <Button
              variant="secondary"
              size="sm"
              onClick={onEdit}
              className="cursor-pointer bg-white/20 hover:bg-white/30 text-white border-white/30"
            >
              <span className="hidden md:inline">{t("edit")}</span>
              <PencilIcon className="h-4 w-4 md:ml-2" />
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={onDelete}
              className="cursor-pointer bg-red-500/20 hover:bg-red-500/30 text-white border-red-300/30"
            >
              <span className="hidden md:inline">{t("delete")}</span>
              <Trash2Icon className="h-4 w-4 md:ml-2" />
            </Button>
          </CardAction>
        </CardHeader>

        {/* Program Details Grid */}
        <CardContent className="pt-0">
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
            <ProgramDetailItem
              label={t("language")}
              value={languageLabels[program.language]}
            />
            <ProgramDetailItem
              label={t("credits")}
              value={`${program.totalCredits} ${t("credits")}`}
            />
            <ProgramDetailItem
              label={t("duration")}
              value={`${program.durationBimesters} ${t("bimesters")}`}
            />
            <ProgramDetailItem
              label={t("status")}
              value={
                program.isActive
                  ? tTable("status.active")
                  : tTable("status.inactive")
              }
            />
          </div>

          {/* Additional Details */}
          <div className="mt-6 pt-6 border-t border-white/20 space-y-3">
            {categoryLabel && (
              <DetailRow label={t("category")} value={categoryLabel} />
            )}

            {program.tuitionPerCredit && (
              <DetailRow
                label={t("tuitionPerCredit")}
                value={`$${program.tuitionPerCredit}`}
              />
            )}

            {/* Bilingual Fields */}
            {codeEs && codeEn && codeEs !== codeEn && (
              <>
                <DetailRow label={t("codeEs")} value={codeEs} />
                <DetailRow label={t("codeEn")} value={codeEn} />
              </>
            )}

            {nameEs && nameEn && nameEs !== nameEn && (
              <>
                <DetailRow label={t("nameEs")} value={nameEs} />
                <DetailRow label={t("nameEn")} value={nameEn} />
              </>
            )}

            {descriptionEs && (
              <DetailRow
                label={t("descriptionEs")}
                value={descriptionEs}
                multiline
              />
            )}

            {descriptionEn && (
              <DetailRow
                label={t("descriptionEn")}
                value={descriptionEn}
                multiline
              />
            )}

            {/* Timestamps */}
            <DetailRow
              label={t("createdAt")}
              value={new Date(program.createdAt).toLocaleDateString(
                locale === "es" ? "es-ES" : "en-US",
                {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                },
              )}
            />

            {program.updatedAt && (
              <DetailRow
                label={t("updatedAt")}
                value={new Date(program.updatedAt).toLocaleDateString(
                  locale === "es" ? "es-ES" : "en-US",
                  {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  },
                )}
              />
            )}
          </div>
        </CardContent>
      </Card>
    </>
  );
}

/**
 * Individual detail item component for the grid
 */
interface ProgramDetailItemProps {
  label: string;
  value: string;
}

function ProgramDetailItem({ label, value }: ProgramDetailItemProps) {
  return (
    <div>
      <div className="text-sm font-medium text-white/70">{label}</div>
      <div className="text-base font-semibold">{value}</div>
    </div>
  );
}

/**
 * Detail row component for additional information
 */
interface DetailRowProps {
  label: string;
  value: string;
  multiline?: boolean;
}

function DetailRow({ label, value, multiline }: DetailRowProps) {
  return (
    <div className={multiline ? "space-y-1" : "flex items-start gap-2"}>
      <span className="text-sm font-medium text-white/70 min-w-[140px]">
        {label}:
      </span>
      <span className={`text-sm ${multiline ? "block" : "flex-1"}`}>
        {value}
      </span>
    </div>
  );
}
