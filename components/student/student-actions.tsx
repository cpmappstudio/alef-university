"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { StudentFormDialog } from "@/components/student/student-form-dialog";
import { CirclePlusIcon } from "lucide-react";

export function StudentActions() {
  const t = useTranslations("admin.students.form");

  return (
    <div className="flex gap-2 mb-4 mt-4 md:mt-0">
      <StudentFormDialog
        mode="create"
        trigger={
          <Button variant="default" className="cursor-pointer">
            {t("createStudentButton")} <CirclePlusIcon />
          </Button>
        }
      />
    </div>
  );
}
