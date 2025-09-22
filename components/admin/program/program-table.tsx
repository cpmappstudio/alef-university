"use client";

import * as React from "react";
import { columns } from "./columns";
import { DataTable } from "../../ui/data-table";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { ProgramFormDialog } from "./program-form-dialog";
import { Program } from "./types";

export default function ProgramTable() {
  const programs = useQuery(api.programs.getAllPrograms, {});
  const [selectedProgram, setSelectedProgram] = React.useState<Program | undefined>();
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);

  const handleRowClick = (program: Program) => {
    setSelectedProgram(program);
    setIsEditDialogOpen(true);
  };

  if (programs === undefined) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-muted-foreground font-medium">Loading programs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-border">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Academic Programs</h1>
          <p className="text-muted-foreground text-lg">
            Manage and organize your university's academic programs
          </p>
        </div>
      </div>

      {/* Data Table Section */}
      <div className="bg-card rounded-xl border border-border shadow-sm">
        <DataTable 
          columns={columns} 
          data={programs} 
          onRowClick={handleRowClick}
        />
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