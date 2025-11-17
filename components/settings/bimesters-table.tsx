"use client";

import * as React from "react";
import { useTranslations, useLocale } from "next-intl";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import type { Id } from "@/convex/_generated/dataModel";
import { BimesterDeleteDialog } from "./bimester-delete-dialog";
import { BimesterEditDialog } from "./bimester-edit-dialog";
import { format } from "date-fns";
import { es, enUS } from "date-fns/locale";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";

interface Bimester {
  _id: Id<"bimesters">;
  _creationTime: number;
  startDate: number;
  endDate: number;
  gradeDeadline: number;
  isActive: boolean;
  createdAt: number;
  updatedAt?: number;
}

interface BimestersTableProps {
  bimesters: Bimester[];
  isLoading: boolean;
}

export function BimestersTable({ bimesters, isLoading }: BimestersTableProps) {
  const tPage = useTranslations("admin.settings.bimestersPage");
  const locale = useLocale();
  const [deletingBimesterId, setDeletingBimesterId] =
    React.useState<Id<"bimesters"> | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  const [bimesterToDelete, setBimesterToDelete] =
    React.useState<Id<"bimesters"> | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);
  const [bimesterToEdit, setBimesterToEdit] = React.useState<Bimester | null>(
    null,
  );
  const deleteBimester = useMutation(api.bimesters.deleteBimester);

  const dateLocale = locale === "es" ? es : enUS;

  const handleDeleteBimester = async (bimesterId: Id<"bimesters">) => {
    try {
      setDeletingBimesterId(bimesterId);
      await deleteBimester({ bimesterId });
      toast.success(tPage("messages.deleteSuccess"));
      setIsDeleteDialogOpen(false);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : tPage("messages.deleteError");
      toast.error(message);
    } finally {
      setDeletingBimesterId(null);
    }
  };

  const handleEditBimester = (bimester: Bimester) => {
    setBimesterToEdit(bimester);
    setIsEditDialogOpen(true);
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

  if (bimesters.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-sm text-muted-foreground">
          {tPage("table.noBimesters")}
        </p>
      </div>
    );
  }

  return (
    <div className="border rounded-md overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-xs sm:text-sm">
              {tPage("table.period")}
            </TableHead>
            <TableHead className="text-xs sm:text-sm">
              {tPage("table.deadline")}
            </TableHead>
            <TableHead className="text-xs sm:text-sm">
              {tPage("table.status")}
            </TableHead>
            <TableHead className="text-right text-xs sm:text-sm w-[60px]">
              <span className="sr-only">{tPage("table.actions")}</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {bimesters.map((bimester) => (
            <TableRow key={bimester._id}>
              <TableCell className="font-medium text-xs sm:text-sm">
                <div className="flex flex-col sm:flex-row sm:items-center sm:gap-1">
                  <span className="whitespace-nowrap">
                    {format(new Date(bimester.startDate), "PP", {
                      locale: dateLocale,
                    })}
                  </span>
                  <span className="hidden sm:inline text-muted-foreground">
                    -
                  </span>
                  <span className="whitespace-nowrap">
                    {format(new Date(bimester.endDate), "PP", {
                      locale: dateLocale,
                    })}
                  </span>
                </div>
              </TableCell>
              <TableCell className="text-xs sm:text-sm whitespace-nowrap">
                {format(new Date(bimester.gradeDeadline), "PP", {
                  locale: dateLocale,
                })}
              </TableCell>
              <TableCell className="text-xs sm:text-sm">
                {bimester.isActive ? (
                  <Badge variant="default" className="text-xs">
                    {tPage("table.active")}
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="text-xs">
                    {tPage("table.inactive")}
                  </Badge>
                )}
              </TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                      <span className="sr-only ">
                        {tPage("table.openMenu")}
                      </span>
                      <MoreHorizontal className="h-4 text-black dark:text-white  w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>
                      {tPage("table.actions")}
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => handleEditBimester(bimester)}
                      className="cursor-pointer"
                    >
                      <Pencil className="mr-2 h-4 w-4" />
                      {tPage("table.edit")}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        setBimesterToDelete(bimester._id);
                        setIsDeleteDialogOpen(true);
                      }}
                      className="cursor-pointer text-destructive focus:text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      {tPage("table.delete")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {bimesterToDelete && (
        <BimesterDeleteDialog
          bimesterId={bimesterToDelete}
          bimesterPeriod={(() => {
            const bimester = bimesters.find((b) => b._id === bimesterToDelete);
            if (!bimester) return "";
            const start = format(new Date(bimester.startDate), "PP", {
              locale: dateLocale,
            });
            const end = format(new Date(bimester.endDate), "PP", {
              locale: dateLocale,
            });
            return `${start} - ${end}`;
          })()}
          isDeleting={deletingBimesterId === bimesterToDelete}
          onDelete={handleDeleteBimester}
          open={isDeleteDialogOpen}
          onOpenChange={setIsDeleteDialogOpen}
        />
      )}
      {bimesterToEdit && (
        <BimesterEditDialog
          bimesterId={bimesterToEdit._id}
          initialStartDate={bimesterToEdit.startDate}
          initialEndDate={bimesterToEdit.endDate}
          initialGradeDeadline={bimesterToEdit.gradeDeadline}
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
        />
      )}
    </div>
  );
}
