"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { Id } from "@/convex/_generated/dataModel";

interface BimesterDeleteDialogProps {
  bimesterId: Id<"bimesters">;
  isDeleting: boolean;
  onDelete: (bimesterId: Id<"bimesters">) => Promise<void>;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function BimesterDeleteDialog({
  bimesterId,
  isDeleting,
  onDelete,
  open,
  onOpenChange,
}: BimesterDeleteDialogProps) {
  const tPage = useTranslations("admin.settings.bimestersPage");

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{tPage("deleteDialog.title")}</AlertDialogTitle>
          <AlertDialogDescription>
            {tPage("deleteDialog.description")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{tPage("deleteDialog.cancel")}</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => onDelete(bimesterId)}
            className="bg-destructive text-white cursor-pointer hover:bg-destructive/90"
          >
            {tPage("deleteDialog.delete")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
