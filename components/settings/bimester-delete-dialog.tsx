"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useQuery } from "convex/react";
import { Loader2, GraduationCap } from "lucide-react";
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

interface BimesterDeleteDialogProps {
  bimesterId: Id<"bimesters">;
  bimesterPeriod: string;
  isDeleting: boolean;
  onDelete: (bimesterId: Id<"bimesters">) => Promise<void>;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function BimesterDeleteDialog({
  bimesterId,
  bimesterPeriod,
  isDeleting,
  onDelete,
  open,
  onOpenChange,
}: BimesterDeleteDialogProps) {
  const tPage = useTranslations("admin.settings.bimestersPage");

  // Get classes associated with this bimester
  const classes = useQuery(
    api.classes.getClassesByBimester,
    open ? { bimesterId } : "skip",
  );

  const classCount = classes?.length ?? 0;

  const handleDelete = async () => {
    try {
      await onDelete(bimesterId);
      if (onOpenChange) onOpenChange(false);
    } catch (error) {
      if (error instanceof Error) {
        // Check if it's the classes associated error
        if (error.message.includes("associated classes")) {
          toast.error(tPage("deleteDialog.errorWithClasses"), {
            description: tPage("deleteDialog.errorWithClassesDescription", {
              count: classCount,
            }),
            duration: 5000,
          });
        } else {
          toast.error(error.message);
        }
      } else {
        toast.error(tPage("messages.deleteError"));
      }
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{tPage("deleteDialog.title")}</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <div>
                {tPage("deleteDialog.description", {
                  bimesterPeriod,
                })}
              </div>

              {classCount > 0 && (
                <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-destructive mb-1">
                    <GraduationCap className="h-4 w-4" />
                    {tPage("deleteDialog.classesAssociated")}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {tPage("deleteDialog.classesAssociatedDescription", {
                      count: classCount,
                    })}
                  </div>
                </div>
              )}

              <div className="text-sm font-medium text-destructive">
                {tPage("deleteDialog.irreversible")}
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>
            {tPage("deleteDialog.cancel")}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isDeleting || classCount > 0}
            className="bg-destructive text-white cursor-pointer hover:bg-destructive/90 disabled:cursor-not-allowed"
          >
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {tPage("deleteDialog.deleting")}
              </>
            ) : (
              tPage("deleteDialog.delete")
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
