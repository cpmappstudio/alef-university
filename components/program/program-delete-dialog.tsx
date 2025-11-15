"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useMutation, useQuery } from "convex/react";
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
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import type { Id } from "@/convex/_generated/dataModel";

interface ProgramDeleteDialogProps {
  programId: Id<"programs">;
  programName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function ProgramDeleteDialog({
  programId,
  programName,
  open,
  onOpenChange,
  onSuccess,
}: ProgramDeleteDialogProps) {
  const t = useTranslations("admin.programs.deleteDialog");
  const [isDeleting, setIsDeleting] = React.useState(false);

  const deleteProgram = useMutation(api.programs.deleteProgram);

  // Get course count for this program
  const courses = useQuery(
    api.courses.getCoursesByProgram,
    open ? { programId } : "skip",
  );

  const courseCount = courses?.length ?? 0;

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      await deleteProgram({ programId });
      toast.success(t("success"));
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      const message = error instanceof Error ? error.message : t("error");
      toast.error(message);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("title")}</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <div>{t("description", { programName })}</div>

              {courseCount > 0 && (
                <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3">
                  <div className="text-sm font-semibold text-destructive mb-1">
                    ⚠️ {t("warning")}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {t("cascadeInfo", { count: courseCount })}
                  </div>
                </div>
              )}

              <div className="text-sm font-medium text-destructive">
                {t("irreversible")}
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>
            {t("cancel")}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isDeleting}
            className="bg-destructive text-white cursor-pointer hover:bg-destructive/90"
          >
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t("deleting")}
              </>
            ) : (
              t("delete")
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
