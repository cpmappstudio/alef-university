"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useMutation } from "convex/react";
import { Loader2, Trash2 } from "lucide-react";
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
  isDeleting: boolean;
  onDelete: (categoryId: Id<"program_categories">) => Promise<void>;
}

export function CategoryDeleteDialog({
  categoryId,
  isDeleting,
  onDelete,
}: CategoryDeleteDialogProps) {
  const tPage = useTranslations("admin.settings.categoriesPage");

  return (
    <AlertDialog>
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
          <AlertDialogDescription>
            {tPage("deleteDialog.description")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{tPage("deleteDialog.cancel")}</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => onDelete(categoryId)}
            className="bg-destructive text-white cursor-pointer hover:bg-destructive/90"
          >
            {tPage("deleteDialog.delete")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
