"use client";

import * as React from "react";
import { columnsPrograms } from "./columns";
import { DataTable } from "../../ui/data-table";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus } from "lucide-react";
import { ProgramFormDialog } from "./program-form-dialog";
import { Program } from "./types";

type ProgramStatusFilter = "all" | "available" | "unavailable";

export default function ProgramTable() {
  const programs = useQuery(api.programs.getAllPrograms, {});
  const [selectedProgram, setSelectedProgram] = React.useState<
    Program | undefined
  >();
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);
  const [programStatusFilter, setProgramStatusFilter] =
    React.useState<ProgramStatusFilter>("all");

  const handleRowClick = (program: Program) => {
    setSelectedProgram(program);
    setIsEditDialogOpen(true);
  };

  // Filter programs based on status filter
  const filteredPrograms = React.useMemo(() => {
    if (!programs) return [];

    switch (programStatusFilter) {
      case "available":
        return programs.filter((program) => program.isActive);
      case "unavailable":
        return programs.filter((program) => !program.isActive);
      case "all":
      default:
        return programs;
    }
  }, [programs, programStatusFilter]);

  if (programs === undefined) {
    return (
      <div className="flex items-center justify-center min-h-[400px] bg-card rounded-xl border border-border/50 shadow-sm">
        <div className="flex flex-col items-center space-y-4 p-8">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-muted-foreground font-medium">
            Loading programs...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Integrated Container - Header and Data Table */}
      <div className="bg-card rounded-xl border border-border/50 shadow-sm overflow-hidden mx-1 sm:mx-0">
        {/* Header Section with Filters */}
        <div className="p-3 sm:p-4 lg:p-6 border-b border-border/30 bg-card">
          <div className="space-y-4">
            {/* Section Title */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="space-y-1">
                <h2 className="text-xl sm:text-2xl font-semibold text-foreground">
                  Program Management
                </h2>
                <p className="text-sm text-muted-foreground">
                  View and manage all academic programs in the system
                </p>
              </div>
            </div>

            {/* Filter Section */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-2">
              {/* Filter Controls */}
              <div className="flex items-center gap-3">
                <label
                  htmlFor="status-filter"
                  className="text-sm font-medium text-foreground whitespace-nowrap"
                >
                  Filter by Availability:
                </label>
                <Select
                  value={programStatusFilter}
                  onValueChange={(value) =>
                    setProgramStatusFilter(value as ProgramStatusFilter)
                  }
                >
                  <SelectTrigger className="w-[160px] h-9 bg-background border-border/50 shadow-sm transition-colors hover:bg-accent/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border/50 shadow-lg">
                    <SelectItem
                      value="all"
                      className="text-sm hover:bg-accent/50"
                    >
                      All Programs
                    </SelectItem>
                    <SelectItem
                      value="available"
                      className="text-sm hover:bg-accent/50"
                    >
                      Available
                    </SelectItem>
                    <SelectItem
                      value="unavailable"
                      className="text-sm hover:bg-accent/50"
                    >
                      Unavailable
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Create Button - Repositioned to the right */}
              <div className="flex justify-center sm:justify-end">
                <ProgramFormDialog
                  mode="create"
                  trigger={
                    <Button
                      variant="default"
                      className="h-9 px-4 font-medium shadow-sm w-full sm:w-auto max-w-[200px]"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Create Program
                    </Button>
                  }
                />
              </div>
            </div>
          </div>
        </div>

        {/* Data Table Section - Integrated */}
        <div className="bg-card">
            <DataTable
            columns={columnsPrograms}
            data={filteredPrograms}
            onRowClick={handleRowClick}
            searchConfig={{
              placeholder: "Search programs by name...",
              columnKey: "nameEs",
            }}
            primaryAction={<div></div>}
            mobileColumns={{
              primaryColumn: "nameEs",
              secondaryColumn: "isActive",
            }}
            emptyState={{
              title: `No ${programStatusFilter === "all" ? "" : programStatusFilter} programs found`,
              description:
                programStatusFilter === "all"
                  ? "No programs have been created yet. Create your first program to get started."
                  : programStatusFilter === "available"
                    ? "There are no available programs found."
                    : "There are no unavailable programs found.",
            }}
            entityName="programs"
          />
        </div>
      </div>

      {/* Edit Dialog */}
      <ProgramFormDialog
        mode="edit"
        program={selectedProgram}
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
      />
    </div>
  );
}
