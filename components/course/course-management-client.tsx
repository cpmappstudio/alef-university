"use client";

/* hooks */
import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";

/* components */
import CustomTable from "@/components/ui/custom-table";
import { Separator } from "@/components/ui/separator";
import CourseActions from "@/components/course/course-actions";
import { courseColumnsWithPrograms } from "@/components/course/columns";

/* lib */
import { api } from "@/convex/_generated/api";
import type {
  CourseDocument,
  CourseManagementClientProps,
} from "@/lib/courses/types";
import { ROUTES } from "@/lib/routes";
import { createCombinedTranslator } from "@/lib/table/utils";

export function CourseManagementClient({
  courses,
}: CourseManagementClientProps) {
  const t = useTranslations("admin.courses.table");
  const tCourseForm = useTranslations("admin.courses.form");
  const locale = useLocale();
  const router = useRouter();

  const liveCourses = useQuery(api.courses.getAllCourses, {});
  const tableData = React.useMemo(
    () => liveCourses ?? courses,
    [liveCourses, courses],
  );

  const tableTranslator = React.useMemo(
    () =>
      createCombinedTranslator(
        [{ prefix: "options.categories", translator: tCourseForm }],
        t,
      ),
    [t, tCourseForm],
  );

  const columns = React.useMemo(
    () => courseColumnsWithPrograms(tableTranslator, locale),
    [tableTranslator, locale],
  );

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
        data={tableData}
        filterColumn="name"
        filterPlaceholder={t("filterPlaceholder")}
        columnsMenuLabel={t("columnsMenuLabel")}
        emptyMessage={t("emptyMessage")}
        onRowClick={handleRowClick}
      />
    </>
  );
}
