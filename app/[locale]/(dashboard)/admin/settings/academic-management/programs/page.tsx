"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useQuery, useMutation } from "convex/react";
import { Plus, Loader2, Trash2 } from "lucide-react";
import SettingsItem from "@/components/admin/settings/settings-item";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/convex/_generated/api";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import type { Id } from "@/convex/_generated/dataModel";

export default function ProgramsSettingsPage() {
  const t = useTranslations("admin.settings");
  const tPage = useTranslations("admin.settings.categoriesPage");
  const categoriesQuery = useQuery(api.programs.getProgramCategories, {});
  const categories = categoriesQuery ?? [];
  const isLoadingCategories = categoriesQuery === undefined;

  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [categoryName, setCategoryName] = React.useState("");
  const [categoryDescription, setCategoryDescription] = React.useState("");
  const [isCreating, setIsCreating] = React.useState(false);
  const [deletingCategoryId, setDeletingCategoryId] =
    React.useState<Id<"program_categories"> | null>(null);
  const createCategory = useMutation(api.programs.createProgramCategory);
  const deleteCategory = useMutation(api.programs.deleteProgramCategory);

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
        description: categoryDescription.trim() || undefined,
      });
      toast.success(tPage("messages.createSuccess"));
      setIsDialogOpen(false);
      setCategoryName("");
      setCategoryDescription("");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : tPage("messages.createError");
      toast.error(message);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteCategory = async (categoryId: Id<"program_categories">) => {
    try {
      setDeletingCategoryId(categoryId);
      await deleteCategory({ categoryId });
      toast.success(tPage("messages.deleteSuccess"));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : tPage("messages.deleteError");
      toast.error(message);
    } finally {
      setDeletingCategoryId(null);
    }
  };

  return (
    <>
      <SettingsItem title={t("categories")}>
        <div className="col-span-2 space-y-4">
          <div className="flex flex-col gap-4 md:flex-row items-left md:items-center justify-between w-full">
            <p className="text-sm text-muted-foreground">
              {tPage("description")}
            </p>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="max-w-fit">
                  {tPage("dialog.trigger")}
                  <Plus className="h-4 w-4 ml-2" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <form onSubmit={handleCreateCategory}>
                  <DialogHeader>
                    <DialogTitle>{tPage("dialog.title")}</DialogTitle>
                    <DialogDescription>
                      {tPage("dialog.description")}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="py-4 space-y-4">
                    <div>
                      <Label htmlFor="category-name">
                        {tPage("dialog.nameLabel")}
                      </Label>
                      <Input
                        id="category-name"
                        value={categoryName}
                        onChange={(e) => setCategoryName(e.target.value)}
                        placeholder={tPage("dialog.namePlaceholder")}
                        className="mt-2"
                        disabled={isCreating}
                      />
                    </div>
                    <div>
                      <Label htmlFor="category-description">
                        {tPage("dialog.descriptionLabel")}
                      </Label>
                      <Input
                        id="category-description"
                        value={categoryDescription}
                        onChange={(e) => setCategoryDescription(e.target.value)}
                        placeholder={tPage("dialog.descriptionPlaceholder")}
                        className="mt-2"
                        disabled={isCreating}
                      />
                    </div>
                  </div>
                  <DialogFooter>
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
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {isLoadingCategories ? (
            <div className="space-y-3">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : categories.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-muted-foreground">
                {tPage("table.noCategories")}
              </p>
            </div>
          ) : (
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{tPage("table.name")}</TableHead>
                    <TableHead>{tPage("table.description")}</TableHead>
                    <TableHead className="text-right">
                      {tPage("table.programs")}
                    </TableHead>
                    <TableHead className="w-[80px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categories.map((category) => (
                    <TableRow key={category._id}>
                      <TableCell className="font-medium">
                        {category.name}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {category.description || tPage("table.noDescription")}
                      </TableCell>
                      <TableCell className="text-right">
                        {category.programCount ?? 0}
                      </TableCell>
                      <TableCell>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              disabled={deletingCategoryId === category._id}
                            >
                              {deletingCategoryId === category._id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                {tPage("deleteDialog.title")}
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                {tPage("deleteDialog.description")}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>
                                {tPage("deleteDialog.cancel")}
                              </AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() =>
                                  handleDeleteCategory(category._id)
                                }
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                {tPage("deleteDialog.delete")}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </SettingsItem>
    </>
  );
}
