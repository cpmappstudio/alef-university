"use client";

import { useTranslations } from "next-intl";
import type { Doc } from "@/convex/_generated/dataModel";

interface ProgramDetailInfoProps {
  program: Doc<"programs">;
  categoryLabel: string;
  locale: string;
}

export default function ProgramDetailInfo({
  program,
  categoryLabel,
  locale,
}: ProgramDetailInfoProps) {
  const t = useTranslations("admin.programs.detail");
  const tTable = useTranslations("admin.programs.table");

  const codeEs = program.codeEs || "";
  const codeEn = program.codeEn || "";
  const nameEs = program.nameEs || "";
  const nameEn = program.nameEn || "";
  const descriptionEs = program.descriptionEs || "";
  const descriptionEn = program.descriptionEn || "";

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
    <div className="space-y-2 my-4">
      {codeEs && (
        <div>
          <span className="text-sm font-medium text-muted-foreground">
            {t("codeEs")}:{" "}
          </span>
          <span className="text-sm">{codeEs}</span>
        </div>
      )}

      {codeEn && (
        <div>
          <span className="text-sm font-medium text-muted-foreground">
            {t("codeEn")}:{" "}
          </span>
          <span className="text-sm">{codeEn}</span>
        </div>
      )}

      {nameEs && (
        <div>
          <span className="text-sm font-medium text-muted-foreground">
            {t("nameEs")}:{" "}
          </span>
          <span className="text-sm">{nameEs}</span>
        </div>
      )}

      {nameEn && (
        <div>
          <span className="text-sm font-medium text-muted-foreground">
            {t("nameEn")}:{" "}
          </span>
          <span className="text-sm">{nameEn}</span>
        </div>
      )}

      {descriptionEs && (
        <div>
          <span className="text-sm font-medium text-muted-foreground">
            {t("descriptionEs")}:{" "}
          </span>
          <span className="text-sm">{descriptionEs}</span>
        </div>
      )}

      {descriptionEn && (
        <div>
          <span className="text-sm font-medium text-muted-foreground">
            {t("descriptionEn")}:{" "}
          </span>
          <span className="text-sm">{descriptionEn}</span>
        </div>
      )}

      <div>
        <span className="text-sm font-medium text-muted-foreground">
          {t("type")}:{" "}
        </span>
        <span className="text-sm">{typeLabels[program.type]}</span>
      </div>

      {categoryLabel && (
        <div>
          <span className="text-sm font-medium text-muted-foreground">
            {t("category")}:{" "}
          </span>
          <span className="text-sm">{categoryLabel}</span>
        </div>
      )}

      <div>
        <span className="text-sm font-medium text-muted-foreground">
          {t("language")}:{" "}
        </span>
        <span className="text-sm">{languageLabels[program.language]}</span>
      </div>

      <div>
        <span className="text-sm font-medium text-muted-foreground">
          {t("credits")}:{" "}
        </span>
        <span className="text-sm">{program.totalCredits}</span>
      </div>

      <div>
        <span className="text-sm font-medium text-muted-foreground">
          {t("duration")}:{" "}
        </span>
        <span className="text-sm">
          {program.durationBimesters} {t("bimesters")}
        </span>
      </div>

      {program.degree && (
        <div>
          <span className="text-sm font-medium text-muted-foreground">
            {t("degree")}:{" "}
          </span>
          <span className="text-sm">{program.degree}</span>
        </div>
      )}

      {program.tuitionPerCredit && (
        <div>
          <span className="text-sm font-medium text-muted-foreground">
            {t("tuitionPerCredit")}:{" "}
          </span>
          <span className="text-sm">${program.tuitionPerCredit}</span>
        </div>
      )}

      <div>
        <span className="text-sm font-medium text-muted-foreground">
          {t("status")}:{" "}
        </span>
        <span className="text-sm">
          {program.isActive
            ? tTable("status.active")
            : tTable("status.inactive")}
        </span>
      </div>

      <div>
        <span className="text-sm font-medium text-muted-foreground">
          {t("createdAt")}:{" "}
        </span>
        <span className="text-sm">
          {new Date(program.createdAt).toLocaleDateString(
            locale === "es" ? "es-ES" : "en-US",
            {
              year: "numeric",
              month: "long",
              day: "numeric",
            },
          )}
        </span>
      </div>

      {program.updatedAt && (
        <div>
          <span className="text-sm font-medium text-muted-foreground">
            {t("updatedAt")}:{" "}
          </span>
          <span className="text-sm">
            {new Date(program.updatedAt).toLocaleDateString(
              locale === "es" ? "es-ES" : "en-US",
              {
                year: "numeric",
                month: "long",
                day: "numeric",
              },
            )}
          </span>
        </div>
      )}
    </div>
  );
}
