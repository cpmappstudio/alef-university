import { Button } from "@/components/ui/button";
import { CirclePlusIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { CourseFormDialog } from "./course-form-dialog";
import { CourseImportDialog } from "./course-import-dialog";

export default function CourseActions() {
  const t = useTranslations("admin.courses.table");

  return (
    <div className="flex gap-2 mb-4 mt-4 md:mt-0">
      <CourseFormDialog
        mode="create"
        trigger={
          <Button variant="default" className="cursor-pointer">
            {t("actions.create")} <CirclePlusIcon />
          </Button>
        }
      />
      <CourseImportDialog />
    </div>
  );
}
