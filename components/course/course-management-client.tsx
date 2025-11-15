"use client";

/* hooks */
import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";

/* components */
import CustomTable from "@/components/ui/custom-table";
import { Separator } from "@/components/ui/separator";
import CourseActions from "@/components/course/course-actions";
import { courseColumnsWithPrograms } from "@/components/course/columns";

/* lib */
import type {
  CourseDocument,
  CourseManagementClientProps,
} from "@/lib/courses/types";
import { ROUTES } from "@/lib/routes";

export function CourseManagementClient({
  courses,
}: CourseManagementClientProps) {
  const t = useTranslations("admin.courses.table");
  const tCourseForm = useTranslations("admin.courses.form");
  const locale = useLocale();
  const router = useRouter();

  const columns = React.useMemo(() => {
    const combinedTranslator = (key: string, values?: Record<string, any>) => {
      if (key.startsWith("options.categories")) {
        return tCourseForm(key, values);
      }
      return t(key, values);
    };
    return courseColumnsWithPrograms(combinedTranslator, locale);
  }, [t, tCourseForm, locale]);

  const handleRowClick = React.useCallback(
    (course: CourseDocument) => {
      router.push(ROUTES.courses.details(course._id).withLocale(locale));
    },
    [router, locale],
  );

  return (
    <>
      <CourseActions />
      <Separator />
      <CustomTable
        columns={columns}
        data={courses}
        filterColumn="name"
        filterPlaceholder={t("filterPlaceholder")}
        columnsMenuLabel={t("columnsMenuLabel")}
        emptyMessage={t("emptyMessage")}
        onRowClick={handleRowClick}
      />
    </>
  );
}
