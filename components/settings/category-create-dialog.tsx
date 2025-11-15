"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useMutation } from "convex/react";
import { Plus, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel, FieldSet } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";

export function CategoryCreateDialog() {
  const tPage = useTranslations("admin.settings.categoriesPage");
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [categoryName, setCategoryName] = React.useState("");
  const [isCreating, setIsCreating] = React.useState(false);
  const createCategory = useMutation(api.programs.createProgramCategory);

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedName = categoryName.trim();
    if (!trimmedName) {
      toast.error(tPage("messages.nameRequired"));
      return;
    }

    try {
      setIsCreating(true);
      await createCategory({
        name: trimmedName,
      });
      toast.success(tPage("messages.createSuccess"));
      setIsDialogOpen(false);
      setCategoryName("");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : tPage("messages.createError");
      toast.error(message);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="max-w-fit">
          {tPage("dialog.trigger")}
          <Plus className="h-4 w-4 ml-2" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleCreateCategory}>
          <DialogHeader className="hidden">
            <DialogTitle>{tPage("dialog.title")}</DialogTitle>
            <DialogDescription>{tPage("dialog.description")}</DialogDescription>
          </DialogHeader>

          <FieldGroup>
            <FieldSet>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="category-name">
                    {tPage("dialog.nameLabel")} *
                  </FieldLabel>
                  <Input
                    id="category-name"
                    value={categoryName}
                    onChange={(e) => setCategoryName(e.target.value)}
                    placeholder={tPage("dialog.namePlaceholder")}
                    disabled={isCreating}
                  />
                </Field>
              </FieldGroup>
            </FieldSet>

            <Field orientation="horizontal">
              <Button type="submit" disabled={isCreating}>
                {isCreating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {tPage("dialog.creating")}
                  </>
                ) : (
                  tPage("dialog.create")
                )}
              </Button>
            </Field>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  );
}
