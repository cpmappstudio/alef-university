"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useQuery } from "convex/react";
import { Loader2, Trash2, FolderTree } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import type { Id } from "@/convex/_generated/dataModel";

interface CategoryDeleteDialogProps {
  categoryId: Id<"program_categories">;
  categoryName: string;
  isDeleting: boolean;
  onDelete: (categoryId: Id<"program_categories">) => Promise<void>;
}

export function CategoryDeleteDialog({
  categoryId,
  categoryName,
  isDeleting,
  onDelete,
}: CategoryDeleteDialogProps) {
  const tPage = useTranslations("admin.settings.categoriesPage");
  const [open, setOpen] = React.useState(false);

  // Get programs using this category
  const programs = useQuery(
    api.programs.getProgramsByCategory,
    open ? { categoryId } : "skip",
  );

  const programCount = programs?.length ?? 0;

  const handleDelete = async () => {
    try {
      await onDelete(categoryId);
      setOpen(false);
    } catch (error) {
      if (error instanceof Error) {
        // Check if it's the programs using category error
        if (error.message.includes("program(s) are using this category")) {
          toast.error(tPage("deleteDialog.errorWithPrograms"), {
            description: tPage("deleteDialog.errorWithProgramsDescription", {
              count: programCount,
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
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button
          variant="destructive"
          size="icon"
          className=" cursor-pointer"
          disabled={isDeleting}
        >
          {isDeleting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="h-4 w-4" />
          )}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{tPage("deleteDialog.title")}</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <div>{tPage("deleteDialog.description", { categoryName })}</div>

              {programCount > 0 && (
                <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-destructive mb-1">
                    <FolderTree className="h-4 w-4" />
                    {tPage("deleteDialog.programsUsing")}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {tPage("deleteDialog.programsUsingDescription", {
                      count: programCount,
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
            disabled={isDeleting || programCount > 0}
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
