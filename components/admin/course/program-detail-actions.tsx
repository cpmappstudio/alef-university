"use client";

import { Button } from "@/components/ui/button";
import { CirclePlusIcon } from "lucide-react";
import { useTranslations } from "next-intl";

interface ProgramDetailActionsProps {
  onCreateCourse: () => void;
}

export default function ProgramDetailActions({
  onCreateCourse,
}: ProgramDetailActionsProps) {
  const t = useTranslations("admin.programs.detail");

  return (
    <div className="flex gap-2 mb-4 mt-4">
      <Button
        variant="default"
        className="cursor-pointer"
        onClick={onCreateCourse}
      >
        {t("createCourse")}
        <CirclePlusIcon className="md:ml-2" />
      </Button>
    </div>
  );
}
