"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useMutation } from "convex/react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import type { Id } from "@/convex/_generated/dataModel";
import { CategoryDeleteDialog } from "./category-delete-dialog";

interface Category {
  _id: Id<"program_categories">;
  _creationTime: number;
  name: string;
  programCount: number;
}

interface CategoriesTableProps {
  categories: Category[];
  isLoading: boolean;
}

export function CategoriesTable({
  categories,
  isLoading,
}: CategoriesTableProps) {
  const tPage = useTranslations("admin.settings.categoriesPage");
  const [deletingCategoryId, setDeletingCategoryId] =
    React.useState<Id<"program_categories"> | null>(null);
  const deleteCategory = useMutation(api.programs.deleteProgramCategory);

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

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
      </div>
    );
  }

  if (categories.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-sm text-muted-foreground">
          {tPage("table.noCategories")}
        </p>
      </div>
    );
  }

  return (
    <div className="border rounded-md">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{tPage("table.name")}</TableHead>
            <TableHead className="text-right">
              {tPage("table.programs")}
            </TableHead>
            <TableHead className="w-[80px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {categories.map((category) => (
            <TableRow key={category._id}>
              <TableCell className="font-medium">{category.name}</TableCell>
              <TableCell className="text-right">
                {category.programCount ?? 0}
              </TableCell>
              <TableCell>
                <CategoryDeleteDialog
                  categoryId={category._id}
                  categoryName={category.name}
                  isDeleting={deletingCategoryId === category._id}
                  onDelete={handleDeleteCategory}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
