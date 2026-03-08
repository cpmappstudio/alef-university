"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { useMutation } from "convex/react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
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

type LibraryCollectionDeleteDialogProps = {
  collectionId: string;
  collectionName: string;
  childCount: number;
  bookCount: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function LibraryCollectionDeleteDialog({
  collectionId,
  collectionName,
  childCount,
  bookCount,
  open,
  onOpenChange,
}: LibraryCollectionDeleteDialogProps) {
  const t = useTranslations("library.collections.deleteDialog");
  const deleteLibraryCollection = useMutation(
    api.library.deleteLibraryCollection,
  );

  const [isDeleting, setIsDeleting] = React.useState(false);
  const isBlocked = childCount > 0 || bookCount > 0;

  const handleDelete = React.useCallback(async () => {
    try {
      setIsDeleting(true);
      await deleteLibraryCollection({
        collectionId: collectionId as Id<"library_collections">,
      });
      toast.success(t("success"));
      onOpenChange(false);
    } catch (error) {
      const message =
        error instanceof Error && error.message.trim().length > 0
          ? error.message
          : t("error");
      toast.error(message);
    } finally {
      setIsDeleting(false);
    }
  }, [collectionId, deleteLibraryCollection, onOpenChange, t]);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("title")}</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <div>{t("description", { name: collectionName })}</div>

              {childCount > 0 && (
                <div className="rounded-md border border-amber-500/20 bg-amber-500/10 p-3 text-sm text-muted-foreground">
                  <div className="font-semibold text-amber-700 dark:text-amber-400">
                    {t("hasChildrenTitle")}
                  </div>
                  <div>
                    {t("hasChildrenDescription", { count: childCount })}
                  </div>
                </div>
              )}

              {childCount === 0 && bookCount > 0 && (
                <div className="rounded-md border border-amber-500/20 bg-amber-500/10 p-3 text-sm text-muted-foreground">
                  <div className="font-semibold text-amber-700 dark:text-amber-400">
                    {t("hasBooksTitle")}
                  </div>
                  <div>{t("hasBooksDescription", { count: bookCount })}</div>
                </div>
              )}

              <div className="text-sm font-medium text-destructive">
                {isBlocked ? t("blocked") : t("irreversible")}
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
            disabled={isDeleting || isBlocked}
            className="cursor-pointer bg-destructive text-white hover:bg-destructive/90 disabled:cursor-not-allowed"
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
