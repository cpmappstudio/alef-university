"use client";

import { Button } from "@/components/ui/button";
import { ArrowLeft, PencilIcon, Trash2Icon } from "lucide-react";
import { useTranslations } from "next-intl";

interface ProgramDetailHeaderProps {
  programName: string;
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export default function ProgramDetailHeader({
  programName,
  onBack,
  onEdit,
  onDelete,
}: ProgramDetailHeaderProps) {
  const t = useTranslations("admin.programs.detail");

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="icon"
          className="cursor-pointer"
          onClick={onBack}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-xl font-semibold">{programName}</h1>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onEdit}
          className="cursor-pointer"
        >
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
      </div>
    </div>
  );
}
