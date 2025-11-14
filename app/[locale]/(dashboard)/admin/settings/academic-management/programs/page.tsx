"use client";

import { useTranslations } from "next-intl";
import { useQuery } from "convex/react";
import SettingsItem from "@/components/admin/settings/settings-item";
import { CategoryCreateDialog } from "@/components/admin/settings/category-create-dialog";
import { CategoriesTable } from "@/components/admin/settings/categories-table";
import { api } from "@/convex/_generated/api";

export default function ProgramsSettingsPage() {
  const t = useTranslations("admin.settings");
  const tPage = useTranslations("admin.settings.categoriesPage");
  const categoriesQuery = useQuery(api.programs.getProgramCategories, {});
  const categories = categoriesQuery ?? [];
  const isLoadingCategories = categoriesQuery === undefined;

  return (
    <>
      <SettingsItem title={t("categories")}>
        <div className="col-span-2 space-y-4">
          <div className="flex flex-col gap-4  items-left justify-between w-full">
            <p className="text-sm text-muted-foreground">
              {tPage("description")}
            </p>
            <CategoryCreateDialog />
          </div>

          <CategoriesTable
            categories={categories}
            isLoading={isLoadingCategories}
          />
        </div>
      </SettingsItem>
    </>
  );
}
