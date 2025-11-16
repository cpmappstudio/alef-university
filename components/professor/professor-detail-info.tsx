"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, PencilIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import type { Doc } from "@/convex/_generated/dataModel";

interface ProfessorDetailInfoProps {
  professor: Doc<"users">;
  onBack: () => void;
  onEdit?: () => void;
}

function InfoItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="font-medium break-all">{value ?? "-"}</p>
    </div>
  );
}

export function ProfessorDetailInfo({
  professor,
  onBack,
  onEdit,
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

  const statusLabel = professor.isActive
    ? translateTable("status.active")
    : translateTable("status.inactive");
  const roleLabel = translateTable(`roles.${professor.role}`) ?? professor.role;

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <Button
            variant="link"
            size="sm"
            onClick={onBack}
            className="w-fit px-0 text-muted-foreground"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            {tDetail("back")}
          </Button>

          <div>
            <h1 className="text-2xl font-semibold">
              {fullName || professor.email}
            </h1>
            <p className="text-muted-foreground">{professor.email}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge
            variant={professor.isActive ? "default" : "secondary"}
            className="uppercase"
          >
            {statusLabel}
          </Badge>
          <Badge variant="outline" className="uppercase">
            {roleLabel}
          </Badge>
          {onEdit && (
            <Button size="sm" onClick={onEdit} className="cursor-pointer">
              <PencilIcon className="mr-2 h-4 w-4" />
              {tDetail("edit")}
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 rounded-lg border bg-card p-4 md:grid-cols-2 lg:grid-cols-3">
        <InfoItem label={tDetail("contact.email")} value={professor.email} />
        <InfoItem
          label={tDetail("contact.phone")}
          value={professor.phone ?? "-"}
        />
        <InfoItem
          label={tDetail("contact.country")}
          value={professor.country ?? "-"}
        />
        <InfoItem
          label={tDetail("meta.clerkId")}
          value={professor.clerkId ?? "-"}
        />
      </div>
    </section>
  );
}
