"use client";

import * as React from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { columnsPeriod } from "../columns";
import { DataTable } from "../../ui/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Filter, ChevronDown, Search } from "lucide-react";
import { Period } from "../types";
import { PeriodFormDialog } from "./period-form-dialog";
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Id } from "@/convex/_generated/dataModel";

type PeriodYearFilter = "all" | "2024" | "2025" | "2026" | "2027";
type PeriodStatusFilter =
  | "all"
  | "planning"
  | "enrollment"
  | "active"
  | "grading"
  | "closed";

export default function PeriodTable() {
  const [codeSearch, setCodeSearch] = React.useState("");
  const [selectedYear, setSelectedYear] =
    React.useState<PeriodYearFilter>("all");
  const [periodStatusFilter, setPeriodStatusFilter] =
    React.useState<PeriodStatusFilter>("all");
  const [selectedPeriod, setSelectedPeriod] = React.useState<
    Period | undefined
  >();
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = React.useState(false);

  // Fetch periods from the backend with filters
  const periods = useQuery(api.admin.getAllPeriods, {
    year: selectedYear === "all" ? undefined : parseInt(selectedYear),
    status: periodStatusFilter === "all" ? undefined : periodStatusFilter,
    searchTerm: codeSearch,
  });

  // Transform periods to match the frontend's expected structure
  const transformedPeriods = React.useMemo(() => {
    if (!periods) return [];
    
    return periods.map(p => ({
      ...p,
      bimester: p.bimesterNumber,   // Map bimesterNumber to bimester
      graddingStart: p.gradingStart, // Fix spelling in frontend data model
      graddingDeadline: p.gradingDeadline // Map gradingDeadline property
    })) as Period[];
  }, [periods]);

  const handleRowClick = (period: Period) => {
    setSelectedPeriod(period);
    setIsEditDialogOpen(true);
  };

  const handleCreatePeriod = () => {
    setIsCreateDialogOpen(true);
  };

  const handleDialogClose = () => {
    setIsEditDialogOpen(false);
    setIsCreateDialogOpen(false);
    setSelectedPeriod(undefined);
  };

  // Count active filters
  const activeFiltersCount = React.useMemo(() => {
    let count = 0;
    if (selectedYear !== "all") count++;
    if (periodStatusFilter !== "all") count++;
    return count;
  }, [selectedYear, periodStatusFilter]);

  // Show loading state while data is being fetched
  if (periods === undefined) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="flex flex-col items-center space-y-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="text-muted-foreground">Loading periods...</p>
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
            {/* Filters Section */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              {/* Code Search */}
              <div className="flex-1 w-full sm:w-auto">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search periods by code..."
                    value={codeSearch}
                    onChange={(e) => setCodeSearch(e.target.value)}
                    className="pl-10 h-10 bg-background border-border/50 shadow-sm transition-colors focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              {/* Filters Dropdown */}
              <div className="flex items-center gap-3">
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
                  <DropdownMenuContent className="w-80 p-4" align="end">
                    <div className="space-y-4">
                      {/* Year Filter */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">
                          Year
                        </label>
                        <Select
                          value={selectedYear}
                          onValueChange={(value) =>
                            setSelectedYear(value as PeriodYearFilter)
                          }
                        >
                          <SelectTrigger className="w-full h-9 bg-background border-border/50 shadow-sm transition-colors hover:bg-accent/50">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-popover border-border/50 shadow-lg">
                            <SelectItem
                              value="all"
                              className="text-sm hover:bg-accent/50"
                            >
                              All Years
                            </SelectItem>
                            <SelectItem
                              value="2024"
                              className="text-sm hover:bg-accent/50"
                            >
                              2024
                            </SelectItem>
                            <SelectItem
                              value="2025"
                              className="text-sm hover:bg-accent/50"
                            >
                              2025
                            </SelectItem>
                            <SelectItem
                              value="2026"
                              className="text-sm hover:bg-accent/50"
                            >
                              2026
                            </SelectItem>
                            <SelectItem
                              value="2027"
                              className="text-sm hover:bg-accent/50"
                            >
                              2027
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Status Filter */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">
                          Status
                        </label>
                        <Select
                          value={periodStatusFilter}
                          onValueChange={(value) =>
                            setPeriodStatusFilter(value as PeriodStatusFilter)
                          }
                        >
                          <SelectTrigger className="w-full h-9 bg-background border-border/50 shadow-sm transition-colors hover:bg-accent/50">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-popover border-border/50 shadow-lg">
                            <SelectItem
                              value="all"
                              className="text-sm hover:bg-accent/50"
                            >
                              All
                            </SelectItem>
                            <SelectItem
                              value="planning"
                              className="text-sm hover:bg-accent/50"
                            >
                              Planning
                            </SelectItem>
                            <SelectItem
                              value="enrollment"
                              className="text-sm hover:bg-accent/50"
                            >
                              Enrollment
                            </SelectItem>
                            <SelectItem
                              value="active"
                              className="text-sm hover:bg-accent/50"
                            >
                              Active
                            </SelectItem>
                            <SelectItem
                              value="grading"
                              className="text-sm hover:bg-accent/50"
                            >
                              Grading
                            </SelectItem>
                            <SelectItem
                              value="closed"
                              className="text-sm hover:bg-accent/50"
                            >
                              Closed
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>

                <Button
                  onClick={handleCreatePeriod}
                  className="bg-deep-koamaru hover:bg-deep-koamaru/90 text-white shadow-md hover:shadow-lg transition-all duration-200 sm:w-auto w-full"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Data Table Section - Integrated */}
        <div className="bg-card overflow-x-auto">
          <div className="min-w-full">
            <DataTable
              columns={columnsPeriod}
              data={transformedPeriods}
              onRowClick={handleRowClick}
              searchConfig={null}
              primaryAction={null}
              mobileColumns={{
                primaryColumn: "code",
                secondaryColumn: "status",
              }}
              emptyState={{
                title: "No periods found",
                description:
                  "No periods found. Try adjusting your filters or create a new period.",
              }}
              entityName="periods"
            />
          </div>
        </div>
      </div>

      {/* Create Period Dialog */}
      <PeriodFormDialog
        mode="create"
        open={isCreateDialogOpen}
        onOpenChange={handleDialogClose}
      />

      {/* Edit Period Dialog */}
      {selectedPeriod && (
        <PeriodFormDialog
          mode="edit"
          period={selectedPeriod}
          open={isEditDialogOpen}
          onOpenChange={handleDialogClose}
        />
      )}
    </div>
  );
}