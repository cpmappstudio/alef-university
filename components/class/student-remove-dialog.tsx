"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
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

interface StudentRemoveDialogProps {
  studentName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void>;
  isRemoving: boolean;
}

export function StudentRemoveDialog({
  studentName,
  open,
  onOpenChange,
  onConfirm,
  isRemoving,
}: StudentRemoveDialogProps) {
  const t = useTranslations("admin.classes.detail.studentRemoveDialog");

  const handleConfirm = async () => {
    await onConfirm();
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("title")}</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <div>{t("description", { studentName })}</div>

              <div className="rounded-md bg-amber-500/10 border border-amber-500/20 p-3">
                <div className="text-sm font-semibold text-amber-600 dark:text-amber-400 mb-1">
                  ⚠️ {t("warning")}
                </div>
                <div className="text-sm text-muted-foreground">
                  {t("warningDescription")}
                </div>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isRemoving}>
            {t("cancel")}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isRemoving}
            className="bg-destructive text-white cursor-pointer hover:bg-destructive/90 disabled:cursor-not-allowed"
          >
            {isRemoving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t("removing")}
              </>
            ) : (
              t("remove")
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
