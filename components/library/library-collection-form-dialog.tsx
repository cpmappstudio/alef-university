"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { useMutation } from "convex/react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useDialogState } from "@/hooks/use-dialog-state";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

type LibraryCollectionFormDialogProps = {
  mode: "create" | "edit";
  parentCollectionId?: string | null;
  parentCollectionName?: string;
  collectionId?: string;
  initialName?: string;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export function LibraryCollectionFormDialog({
  mode,
  parentCollectionId,
  parentCollectionName,
  collectionId,
  initialName,
  trigger,
  open: controlledOpen,
  onOpenChange,
}: LibraryCollectionFormDialogProps) {
  const t = useTranslations(
    mode === "create"
      ? "library.collections.createDialog"
      : "library.collections.editDialog",
  );
  const { open, setOpen } = useDialogState({
    controlledOpen,
    onOpenChange,
  });

  const createLibraryCollection = useMutation(api.library.createLibraryCollection);
  const updateLibraryCollection = useMutation(api.library.updateLibraryCollection);

  const [name, setName] = React.useState(initialName ?? "");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (!open) {
      return;
    }

    setName(initialName ?? "");
    setIsSubmitting(false);
  }, [initialName, open]);

  const handleSubmit = React.useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      const trimmedName = name.trim();
      if (!trimmedName) {
        toast.error(t("nameRequired"));
        return;
      }

      try {
        setIsSubmitting(true);

        if (mode === "create") {
          await createLibraryCollection({
            name: trimmedName,
            parentId: parentCollectionId
              ? (parentCollectionId as Id<"library_collections">)
              : undefined,
          });
        } else {
          if (!collectionId) {
            throw new Error("Collection id is required for edit mode");
          }

          await updateLibraryCollection({
            collectionId: collectionId as Id<"library_collections">,
            name: trimmedName,
          });
        }

        toast.success(t("success"));
        setOpen(false);
      } catch (error) {
        const message =
          error instanceof Error && error.message.trim().length > 0
            ? error.message
            : t("error");
        toast.error(message);
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      collectionId,
      createLibraryCollection,
      mode,
      name,
      parentCollectionId,
      setOpen,
      t,
      updateLibraryCollection,
    ],
  );

  const description =
    mode === "create"
      ? parentCollectionName
        ? t("descriptionNested", { name: parentCollectionName })
        : t("description")
      : t("description");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>{t("title")}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>

          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="library-collection-name">
                {t("nameLabel")}
              </FieldLabel>
              <Input
                id="library-collection-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder={t("namePlaceholder")}
                disabled={isSubmitting}
              />
            </Field>
          </FieldGroup>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isSubmitting}
            >
              {t("cancel")}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("submitting")}
                </>
              ) : (
                t("submit")
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
