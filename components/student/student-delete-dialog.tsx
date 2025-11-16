"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useMutation } from "convex/react";
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
import type { Id } from "@/convex/_generated/dataModel";
import { toast } from "sonner";

interface StudentDeleteDialogProps {
  studentId: Id<"users">;
  studentName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function StudentDeleteDialog({
  studentId,
  studentName,
  open,
  onOpenChange,
  onSuccess,
}: StudentDeleteDialogProps) {
  const t = useTranslations("admin.students.deleteDialog");
  const [isDeleting, setIsDeleting] = React.useState(false);
  const deleteUser = useMutation(api.users.deleteUser);

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      await deleteUser({ userId: studentId });
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
          <AlertDialogDescription>
            {t("description", { studentName })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>
            {t("cancel")}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isDeleting}
            className="bg-destructive text-white hover:bg-destructive/90 cursor-pointer"
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
