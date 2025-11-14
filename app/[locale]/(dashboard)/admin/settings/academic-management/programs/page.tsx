"use client";

import { useTranslations } from "next-intl";
import { useQuery } from "convex/react";
import SettingsItem from "@/components/admin/settings/settings-item";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api } from "@/convex/_generated/api";
import { Skeleton } from "@/components/ui/skeleton";

export default function ProgramsSettingsPage() {
  const t = useTranslations("admin.settings");
  const categoriesQuery = useQuery(api.programs.getProgramCategories, {});
  const categories = categoriesQuery ?? [];
  const isLoadingCategories = categoriesQuery === undefined;

  return (
    <>
      <SettingsItem title={t("categories")}>
        <div className="col-span-2 space-y-4">
          <p className="text-sm text-muted-foreground">
            Program categories help organize academic programs into different
            groups. Each program must be assigned to a category. Categories are
            used throughout the system to filter and organize programs.
          </p>

          {isLoadingCategories ? (
            <div className="space-y-3">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : categories.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-muted-foreground">
                No categories available. Create categories to organize your
                programs.
              </p>
            </div>
          ) : (
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Programs</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categories.map((category) => (
                    <TableRow key={category._id}>
                      <TableCell className="font-medium">
                        {category.name}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {category.description || "No description"}
                      </TableCell>
                      <TableCell className="text-right">
                        {category.programCount ?? 0}
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
