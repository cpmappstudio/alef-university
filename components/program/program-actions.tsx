import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { CirclePlusIcon, FileDownIcon, InfoIcon } from "lucide-react";
import { useTranslations } from "next-intl";
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

      {/*<div className="flex items-center gap-2">
        <Button
          className="cursor-pointer bg-white dark:bg-dark-gunmetal dark:text-white"
          variant="secondary"
        >
          {t("actions.import")} <FileDownIcon />
        </Button>
        <Tooltip>
          <TooltipTrigger asChild>
            <InfoIcon className="size-4.5 text-muted-foreground hidden md:block" />
          </TooltipTrigger>
          <TooltipContent>
            <p>Add to library</p>
          </TooltipContent>
        </Tooltip>
      </div>*/}
    </div>
  );
}
