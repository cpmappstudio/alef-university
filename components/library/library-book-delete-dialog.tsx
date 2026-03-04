"use client";

import * as React from "react";
import { useMutation } from "convex/react";
import { useTranslations } from "next-intl";
import { Loader2, TriangleAlert } from "lucide-react";
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

interface LibraryBookDeleteDialogProps {
  bookId: Id<"library_books">;
  bookTitle: string;
  fileName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function LibraryBookDeleteDialog({
  bookId,
  bookTitle,
  fileName,
  open,
  onOpenChange,
  onSuccess,
}: LibraryBookDeleteDialogProps) {
  const t = useTranslations("library.detail.deleteDialog");
  const deleteLibraryBook = useMutation(api.library.deleteLibraryBook);
  const [isDeleting, setIsDeleting] = React.useState(false);

  const handleDelete = React.useCallback(async () => {
    try {
      setIsDeleting(true);
      await deleteLibraryBook({ bookId });
      toast.success(t("success"));
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      const message =
        error instanceof Error && error.message.trim().length > 0
          ? error.message
          : t("error");
      toast.error(message);
    } finally {
      setIsDeleting(false);
    }
  }, [bookId, deleteLibraryBook, onOpenChange, onSuccess, t]);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("title")}</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <div>{t("description", { bookTitle })}</div>

              <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3">
                <div className="mb-1 flex items-center gap-2 text-sm font-semibold text-amber-600 dark:text-amber-400">
                  <TriangleAlert className="h-4 w-4" />
                  {t("warning")}
                </div>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <div>{t("fileInfo", { fileName })}</div>
                  <div>{t("pdfInfo")}</div>
                </div>
              </div>

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
            className="bg-destructive text-white hover:bg-destructive/90"
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
