"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import type { Doc } from "@/convex/_generated/dataModel";
import { UserRound, PencilIcon, Trash2Icon } from "lucide-react";
import {
  GradientCard,
  GradientCardHeader,
  GradientCardContent,
  GradientCardDetailGrid,
  GradientCardDetailItem,
} from "@/components/ui/gradient-card";

interface ProfessorDetailInfoProps {
  professor: Doc<"users">;
  onEdit?: () => void;
  onDelete: () => void;
}

export function ProfessorDetailInfo({
  professor,
  onEdit,
  onDelete,
}: ProfessorDetailInfoProps) {
  const tDetail = useTranslations("admin.professors.detail");
  const tTable = useTranslations("admin.professors.table");
  const translateTable = tTable as (
    key: string,
    values?: Record<string, unknown>,
  ) => string;

  const fullName = `${professor.firstName ?? ""} ${professor.lastName ?? ""}`
    .trim()
    .replace(/\s+/g, " ");

  const displayName = fullName || professor.email;

  const statusLabel = professor.isActive
    ? translateTable("status.active")
    : translateTable("status.inactive");
  const roleLabel = translateTable(`roles.${professor.role}`) ?? professor.role;

  const actions = (
    <>
      {onEdit && (
        <Button size="sm" onClick={onEdit} className="cursor-pointer">
          <span className="hidden md:inline">{tDetail("edit")}</span>
          <PencilIcon className="h-4 w-4 md:ml-2" />
        </Button>
      )}
      <Button
        variant="destructive"
        size="sm"
        onClick={onDelete}
        className="cursor-pointer"
      >
        <span className="hidden md:inline">{tDetail("delete")}</span>
        <Trash2Icon className="h-4 w-4 md:ml-2" />
      </Button>
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
            label={tDetail("info.fullName")}
            value={displayName}
          />
          <GradientCardDetailItem
            label={tDetail("contact.email")}
            value={professor.email ?? "—"}
          />
          <GradientCardDetailItem
            label={tDetail("contact.phone")}
            value={professor.phone ?? "—"}
          />
          <GradientCardDetailItem
            label={tDetail("contact.country")}
            value={professor.country ?? tDetail("info.unknown")}
          />
          <GradientCardDetailItem
            label={tDetail("info.status")}
            value={statusLabel}
          />
          <GradientCardDetailItem
            label={tDetail("info.role")}
            value={roleLabel}
          />
        </GradientCardDetailGrid>
      </GradientCardContent>
    </GradientCard>
  );
}
