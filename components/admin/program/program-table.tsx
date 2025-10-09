"use client";

import * as React from "react";
import { columnsPrograms } from "../columns";
import { DataTable } from "../../ui/data-table";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, Filter, ChevronDown, Search } from "lucide-react";
import { ProgramFormDialog } from "./program-form-dialog";
import { Program } from "../types";

type ProgramStatusFilter = "all" | "available" | "unavailable";
type ProgramTypeFilter = "all" | "diploma" | "bachelor" | "master" | "doctorate";
type ProgramLanguageFilter = "all" | "es" | "en" | "both";

export default function ProgramTable() {
  const programs = useQuery(api.programs.getAllPrograms, {});
  const [nameSearch, setNameSearch] = React.useState("");
  const [selectedProgram, setSelectedProgram] = React.useState<
    Program | undefined
  >();
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);
  const [programStatusFilter, setProgramStatusFilter] =
    React.useState<ProgramStatusFilter>("all");
  const [programTypeFilter, setProgramTypeFilter] =
    React.useState<ProgramTypeFilter>("all");
  const [programLanguageFilter, setProgramLanguageFilter] =
    React.useState<ProgramLanguageFilter>("all");

  const handleRowClick = (program: Program) => {
    setSelectedProgram(program);
    setIsEditDialogOpen(true);
  };

  // Count active filters in DropdownMenu
  const activeFiltersCount = React.useMemo(() => {
    let count = 0;
    if (programStatusFilter !== "all") count++;
    if (programTypeFilter !== "all") count++;
    if (programLanguageFilter !== "all") count++;
    return count;
  }, [programStatusFilter, programTypeFilter, programLanguageFilter]);

  // Filter programs based on all active filters
  const filteredPrograms = React.useMemo(() => {
    if (!programs) return [];

    return programs.filter((program) => {
      // Name search filter
      const nameMatch =
        nameSearch === "" ||
        program.nameEs?.toLowerCase().includes(nameSearch.toLowerCase()) ||
        program.nameEn?.toLowerCase().includes(nameSearch.toLowerCase()) ||
        program.code?.toLowerCase().includes(nameSearch.toLowerCase());

      // Status filter
      const statusMatch =
        programStatusFilter === "all" ||
        (programStatusFilter === "available" && program.isActive) ||
        (programStatusFilter === "unavailable" && !program.isActive);

      // Type filter
      const typeMatch =
        programTypeFilter === "all" || program.type === programTypeFilter;

      // Language filter
      const languageMatch =
        programLanguageFilter === "all" ||
        program.language === programLanguageFilter ||
        (programLanguageFilter === "both" && program.language === "both");

      return nameMatch && statusMatch && typeMatch && languageMatch;
    });
  }, [programs, nameSearch, programStatusFilter, programTypeFilter, programLanguageFilter]);

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
            {/* Header with Title and Filters */}
            <div className="space-y-4">

              {/* Filters Section */}
              <div className="space-y-4">
                {/* Desktop: horizontal layout, Tablet: 2 rows, Mobile: stacked */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  {/* Name Search */}
                  <div className="flex-1 w-full sm:w-auto">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search programs by name, code..."
                        value={nameSearch}
                        onChange={(e) => setNameSearch(e.target.value)}
                        className="pl-10 h-10 bg-background border-border/50 shadow-sm transition-colors focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                  </div>

                  {/* Filters Dropdown and Create Button */}
                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          className="h-10 px-3 border-border/50 shadow-sm transition-colors hover:bg-accent/50"
                        >
                          <Filter className="h-4 w-4" />
                          {activeFiltersCount > 0 && (
                            <span className="ml-2 bg-primary text-primary-foreground text-xs rounded-full px-2 py-0.5 min-w-[1.25rem] h-5 flex items-center justify-center">
                              {activeFiltersCount}
                            </span>
                          )}
                          <ChevronDown className="h-4 w-4 ml-2" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-72 p-4" align="end">
                        <DropdownMenuSeparator className="mb-4" />

                        <div className="space-y-4">
                          {/* Availability Filter */}
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">
                              Availability
                            </label>
                            <Select
                              value={programStatusFilter}
                              onValueChange={(value) =>
                                setProgramStatusFilter(value as ProgramStatusFilter)
                              }
                            >
                              <SelectTrigger className="w-full h-9 bg-background border-border/50 shadow-sm transition-colors hover:bg-accent/50">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-popover border-border/50 shadow-lg">
                                <SelectItem value="all" className="text-sm hover:bg-accent/50">All</SelectItem>
                                <SelectItem value="available" className="text-sm hover:bg-accent/50">Available</SelectItem>
                                <SelectItem value="unavailable" className="text-sm hover:bg-accent/50">Unavailable</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Type Filter */}
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">
                              Type
                            </label>
                            <Select
                              value={programTypeFilter}
                              onValueChange={(value) =>
                                setProgramTypeFilter(value as ProgramTypeFilter)
                              }
                            >
                              <SelectTrigger className="w-full h-9 bg-background border-border/50 shadow-sm transition-colors hover:bg-accent/50">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-popover border-border/50 shadow-lg">
                                <SelectItem value="all" className="text-sm hover:bg-accent/50">All</SelectItem>
                                <SelectItem value="diploma" className="text-sm hover:bg-accent/50">Diploma</SelectItem>
                                <SelectItem value="bachelor" className="text-sm hover:bg-accent/50">Bachelor</SelectItem>
                                <SelectItem value="master" className="text-sm hover:bg-accent/50">Master</SelectItem>
                                <SelectItem value="doctorate" className="text-sm hover:bg-accent/50">Doctorate</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Language Filter */}
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">
                              Language
                            </label>
                            <Select
                              value={programLanguageFilter}
                              onValueChange={(value) =>
                                setProgramLanguageFilter(value as ProgramLanguageFilter)
                              }
                            >
                              <SelectTrigger className="w-full h-9 bg-background border-border/50 shadow-sm transition-colors hover:bg-accent/50">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-popover border-border/50 shadow-lg">
                                <SelectItem value="all" className="text-sm hover:bg-accent/50">All</SelectItem>
                                <SelectItem value="en" className="text-sm hover:bg-accent/50">English</SelectItem>
                                <SelectItem value="es" className="text-sm hover:bg-accent/50">Spanish</SelectItem>
                                <SelectItem value="both" className="text-sm hover:bg-accent/50">English/Spanish</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </DropdownMenuContent>
                    </DropdownMenu>

                    {(activeFiltersCount > 0 || nameSearch !== "") && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setNameSearch("");
                          setProgramStatusFilter("all");
                          setProgramTypeFilter("all");
                          setProgramLanguageFilter("all");
                        }}
                        className="h-10 px-3 text-sm text-muted-foreground hover:text-foreground"
                      >
                        Clear all
                      </Button>
                    )}

                    {/* Create Program Button */}
                    <ProgramFormDialog
                      mode="create"
                      trigger={
                        <Button
                          variant="default"
                          className="h-10 px-4 font-medium shadow-sm"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      }
                    />
                  </div>
                </div>
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
            searchConfig={null}
            primaryAction={null}
            mobileColumns={{
              primaryColumn: "nameEs",
              secondaryColumn: "isActive",
            }}
            emptyState={{
              title: "No programs found",
              description: (() => {
                const hasFilters =
                  nameSearch !== "" ||
                  programStatusFilter !== "all" ||
                  programTypeFilter !== "all" ||
                  programLanguageFilter !== "all";

                if (!hasFilters) {
                  return "No programs have been created yet. Create your first program to get started.";
                }

                const activeFilters = [];
                if (nameSearch !== "") activeFilters.push(`"${nameSearch}"`);
                if (programStatusFilter !== "all") activeFilters.push(programStatusFilter);
                if (programTypeFilter !== "all") activeFilters.push(programTypeFilter);
                if (programLanguageFilter !== "all") {
                  const languageLabel = programLanguageFilter === "en" ? "English" : programLanguageFilter === "es" ? "Spanish" : "Both languages";
                  activeFilters.push(languageLabel);
                }

                return `No programs match the selected filters: ${activeFilters.join(", ")}. Try adjusting your filters.`;
              })()
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
