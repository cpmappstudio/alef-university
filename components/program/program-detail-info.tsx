"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import type { Doc } from "@/convex/_generated/dataModel";
import { GraduationCap, PencilIcon, Trash2Icon } from "lucide-react";
import {
  GradientCard,
  GradientCardHeader,
  GradientCardContent,
  GradientCardDetailGrid,
  GradientCardDetailItem,
  GradientCardDescriptions,
  GradientCardDescriptionBlock,
} from "@/components/ui/gradient-card";

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
        icon={<GraduationCap className="size-6" />}
        title={programName}
        actions={actions}
      />

      <GradientCardContent>
        <GradientCardDetailGrid>
          {/* Primary Information */}
          <GradientCardDetailItem
            label={t("language")}
            value={languageLabels[program.language]}
          />
          <GradientCardDetailItem
            label={t("credits")}
            value={`${program.totalCredits}`}
          />
          <GradientCardDetailItem
            label={t("duration")}
            value={`${program.durationBimesters} ${t("bimesters")}`}
          />

          {/* Category and Status */}
          {categoryLabel && (
            <GradientCardDetailItem
              label={t("category")}
              value={categoryLabel}
            />
          )}
          <GradientCardDetailItem
            label={t("status")}
            value={
              program.isActive
                ? tTable("status.active")
                : tTable("status.inactive")
            }
          />

          {/* Financial Information */}
          {program.tuitionPerCredit && (
            <GradientCardDetailItem
              label={t("tuitionPerCredit")}
              value={`$${program.tuitionPerCredit}`}
            />
          )}

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
            value={new Date(program.createdAt).toLocaleDateString(
              locale === "es" ? "es-ES" : "en-US",
              {
                year: "numeric",
                month: "short",
                day: "numeric",
              },
            )}
          />
          {program.updatedAt && (
            <GradientCardDetailItem
              label={t("updatedAt")}
              value={new Date(program.updatedAt).toLocaleDateString(
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
