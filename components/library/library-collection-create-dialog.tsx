"use client";

import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { LibraryCollectionFormDialog } from "@/components/library/library-collection-form-dialog";

type LibraryCollectionCreateDialogProps = {
  parentCollectionId?: string | null;
  parentCollectionName?: string;
  trigger?: React.ReactNode;
};

export function LibraryCollectionCreateDialog({
  parentCollectionId,
  parentCollectionName,
  trigger,
}: LibraryCollectionCreateDialogProps) {
  const t = useTranslations("library.collections.createDialog");

  return (
    <LibraryCollectionFormDialog
      mode="create"
      parentCollectionId={parentCollectionId}
      parentCollectionName={parentCollectionName}
      trigger={
        trigger ?? (
          <Button
            variant="outline"
            className="cursor-pointer bg-white dark:bg-dark-gunmetal"
          >
            {t("trigger")}
            <Plus className="h-4 w-4" />
          </Button>
        )
      }
    />
  );
}
