"use client";

import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { ROUTES } from "@/lib/routes";
import { Separator } from "@/components/ui/separator";
import CustomTable from "@/components/table/custom-table";
import { ProfessorFormDialog } from "@/components/professor/professor-form-dialog";
import { ProfessorDetailInfo } from "@/components/professor/professor-detail-info";
import { professorClassesColumns } from "@/components/professor/professor-classes-columns";
import { ProfessorDeleteDialog } from "@/components/professor/professor-delete-dialog";
import { createProfessorClassFilters } from "@/lib/table/filter-configs";
import type {
  ProfessorClassRow,
  ProfessorDetailClientProps,
  ProfessorDocument,
} from "@/lib/professors/types";

export function ProfessorDetailClient({
  professorId,
  initialProfessor,
  initialClasses,
  userRole,
}: ProfessorDetailClientProps) {
  const locale = useLocale();
  const router = useRouter();
  const tDetail = useTranslations("admin.professors.detail");
  const tClassDetail = useTranslations("admin.classes.detail");

  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);

  const professorQuery = useQuery(api.users.getUser, { userId: professorId });
  const classesQuery = useQuery(api.classes.getClassesByProfessor, {
    professorId,
  });

  const professor = professorQuery ?? initialProfessor ?? null;
  const assignedClasses =
    (classesQuery as ProfessorClassRow[] | undefined) ?? initialClasses ?? [];

  const columns = React.useMemo(
    () => professorClassesColumns(tDetail, tClassDetail, locale),
    [tDetail, tClassDetail, locale],
  );

  const filterConfigs = React.useMemo(
    () => createProfessorClassFilters(tDetail),
    [tDetail],
  );
  const displayName = React.useMemo(() => {
    if (!professor) return "";
    const fullName = `${professor.firstName ?? ""} ${professor.lastName ?? ""}`
      .trim()
      .replace(/\s+/g, " ");
    return fullName || professor.email || "";
  }, [professor]);

  const handleRowClick = React.useCallback(
    (row: ProfessorClassRow) => {
      router.push(ROUTES.classes.details(row._id).withLocale(locale));
    },
    [router, locale],
  );

  const handleEdit = React.useCallback(() => {
    setIsEditDialogOpen(true);
  }, []);

  const handleDelete = React.useCallback(() => {
    setIsDeleteDialogOpen(true);
  }, []);

  const handleDeleteSuccess = React.useCallback(() => {
    router.push(ROUTES.professors.root.withLocale(locale));
  }, [router, locale]);

  if (!professor) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-muted-foreground">{tDetail("loading")}</p>
      </div>
    );
  }

  return (
    <>
      <ProfessorFormDialog
        mode="edit"
        professor={professor as ProfessorDocument}
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
      />
      <ProfessorDeleteDialog
        professorId={professor._id as Id<"users">}
        professorName={displayName ?? ""}
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onSuccess={handleDeleteSuccess}
      />

      <ProfessorDetailInfo
        professor={professor}
        onEdit={
          userRole === "admin" || userRole === "superadmin"
            ? handleEdit
            : undefined
        }
        onDelete={
          userRole === "admin" || userRole === "superadmin"
            ? handleDelete
            : () => {}
        }
        canDelete={userRole === "admin" || userRole === "superadmin"}
        userRole={userRole}
      />

      <Separator />

      <section className="space-y-4">
        <CustomTable
          columns={columns}
          data={assignedClasses}
          filterColumn="search"
          filterPlaceholder={tDetail("filterClassesPlaceholder")}
          columnsMenuLabel={tDetail("columnsMenuLabel")}
          filterConfigs={filterConfigs}
          filtersMenuLabel={tDetail("filters.title") || "Filters"}
          initialSorting={[{ id: "status", desc: false }]}
          emptyMessage={tDetail("emptyClassesMessage")}
          onRowClick={handleRowClick}
        />
      </section>
    </>
  );
}
