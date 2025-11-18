"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { ProfessorFormDialog } from "@/components/professor/professor-form-dialog";
import { ProfessorImportDialog } from "@/components/professor/professor-import-dialog";
import { CirclePlusIcon } from "lucide-react";

export function ProfessorActions() {
  const t = useTranslations("admin.professors.form");

  return (
    <div className="flex gap-2 mb-4 mt-4 md:mt-0">
      <ProfessorFormDialog
        mode="create"
        trigger={
          <Button variant="default" className="cursor-pointer">
            {t("createProfessorButton")} <CirclePlusIcon />
          </Button>
        }
      />
      <ProfessorImportDialog />
    </div>
  );
}
