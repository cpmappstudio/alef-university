"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useMutation, useQuery } from "convex/react";
import { Loader2, Users } from "lucide-react";
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

  // Get students enrolled in this program
  const studentsData = useQuery(
    api.programs.getProgramStudents,
    open ? { programId, includeProgress: false } : "skip",
  );

  const courseCount = courses?.length ?? 0;
  const studentCount = studentsData?.students?.length ?? 0;

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      await deleteProgram({ programId });
      toast.success(t("success"));
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      if (error instanceof Error) {
        // Check if it's the enrolled students error
        if (error.message.includes("enrolled students")) {
          toast.error(t("errorWithStudents"), {
            description: t("errorWithStudentsDescription", {
              count: studentCount,
            }),
            duration: 5000,
          });
        } else {
          toast.error(error.message);
        }
      } else {
        toast.error(t("error"));
      }
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

              {studentCount > 0 && (
                <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-destructive mb-1">
                    <Users className="h-4 w-4" />
                    {t("studentsEnrolled")}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {t("studentsEnrolledDescription", {
                      count: studentCount,
                    })}
                  </div>
                </div>
              )}

              {courseCount > 0 && (
                <div className="rounded-md bg-amber-500/10 border border-amber-500/20 p-3">
                  <div className="text-sm font-semibold text-amber-600 dark:text-amber-400 mb-1">
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
            disabled={isDeleting || studentCount > 0}
            className="bg-destructive text-white cursor-pointer hover:bg-destructive/90 disabled:cursor-not-allowed"
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
