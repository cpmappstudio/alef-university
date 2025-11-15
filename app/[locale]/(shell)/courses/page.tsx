"use client";

import * as React from "react";
import CustomTable from "@/components/ui/custom-table";
import { courseColumnsWithPrograms } from "@/components/course/columns";
import { useLocale, useTranslations } from "next-intl";
import { useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { Separator } from "@/components/ui/separator";
import CourseActions from "@/components/course/course-actions";

export default function CourseManagementPage() {
  const t = useTranslations("admin.courses.table");
  const tCourseForm = useTranslations("admin.courses.form");
  const locale = useLocale();
  const router = useRouter();

  const data = useQuery(api.courses.getAllCourses, {});

  const columns = React.useMemo(() => {
    // Create a combined translator that handles both table and course form translations
    const combinedTranslator = (key: string, values?: Record<string, any>) => {
      // If the key starts with "options.categories", use course form translations
      if (key.startsWith("options.categories")) {
        return tCourseForm(key, values);
      }
      // Otherwise use table translations
      return t(key, values);
    };
    return courseColumnsWithPrograms(combinedTranslator, locale);
  }, [t, tCourseForm, locale]);

  const handleRowClick = React.useCallback(
    (course: Doc<"courses">) => {
      router.push(`/${locale}/admin/courses/${course._id}`);
    },
    [router, locale],
  );

  const filterColumnKey = "name";

  return (
    <>
      <CourseActions />
      <Separator className="" />
      <CustomTable
        columns={columns}
        data={data}
        filterColumn={filterColumnKey}
        filterPlaceholder={t("filterPlaceholder")}
        columnsMenuLabel={t("columnsMenuLabel")}
        emptyMessage={t("emptyMessage")}
        onRowClick={handleRowClick}
      />
    </>
  );
}
