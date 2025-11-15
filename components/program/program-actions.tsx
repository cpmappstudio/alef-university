// ################################################################################
// # File: program-actions.tsx                                                    #
// # Check: 11/15/2025                                                            #
// ################################################################################

/* hooks */
import { useTranslations } from "next-intl";

/* components */
import { Button } from "@/components/ui/button";
import { CirclePlusIcon } from "lucide-react";
import ProgramFormDialog from "./program-form-dialog";

export default function ProgramActions() {
  const t = useTranslations("admin.programs.table");

  return (
    <div className="flex gap-2 mb-4 mt-4 md:mt-0">
      <ProgramFormDialog
        mode="create"
        trigger={
          <Button variant="default" className="cursor-pointer">
            {t("actions.create")} <CirclePlusIcon />
          </Button>
        }
      />
    </div>
  );
}
