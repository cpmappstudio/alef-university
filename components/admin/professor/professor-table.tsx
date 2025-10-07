"use client";

import * as React from "react";
import { columnsProfessor } from "../columns";
import { DataTable } from "../../ui/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Plus,
  Filter,
  ChevronDown,
  Check,
  ChevronsUpDown,
  Search,
} from "lucide-react";
import { Professor } from "../types";
import { ProfessorFormDialog } from "./professor-form-dialog";
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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";

type ProfessorTitleFilter =
  | "all"
  | "assistant"
  | "associate"
  | "full"
  | "emeritus"
  | "adjunct";

export default function ProfessorTable() {
  const [nameSearch, setNameSearch] = React.useState("");
  const [selectedDepartmentId, setSelectedDepartmentId] =
    React.useState<string>("all");
  const [departmentSearchOpen, setDepartmentSearchOpen] = React.useState(false);
  const [departmentSearchValue, setDepartmentSearchValue] = React.useState("");
  const [professorTitleFilter, setProfessorTitleFilter] =
    React.useState<ProfessorTitleFilter>("all");
  const [selectedProfessor, setSelectedProfessor] = React.useState<
    Professor | undefined
  >();
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = React.useState(false);

  const professorsQuery = useQuery(api.admin.getAllUsers, { role: "professor" });
  const professors = React.useMemo(() => {
    if (!professorsQuery) return [];
    return professorsQuery.filter(user => user.role === "professor") as Professor[];
  }, [professorsQuery]);

  const departments = React.useMemo(() => {
    if (!professors || professors.length === 0) return [];
    
    // Extract unique departments and filter out undefined/null values
    const departmentSet = new Set(
      professors
        .map(p => p.professorProfile?.department)
        .filter((dept): dept is string => Boolean(dept)) // Type guard
        .map(dept => dept.trim()) // Now safe
    );
    
    // Convert to array of objects with _id and name properties
    return Array.from(departmentSet)
      .sort((a, b) => a.localeCompare(b))
      .map(name => ({ _id: name, name }));
  }, [professors]);

  const filteredProfessors = React.useMemo(() => {
    if (!professors) return []; // Return empty array while loading

    return professors.filter((professor) => {
      const nameMatch =
        nameSearch === "" ||
        professor.firstName?.toLowerCase().includes(nameSearch.toLowerCase()) ||
        professor.lastName?.toLowerCase().includes(nameSearch.toLowerCase()) ||
        professor.professorProfile?.employeeCode
          ?.toLowerCase()
          .includes(nameSearch.toLowerCase());

      const departmentMatch =
        selectedDepartmentId === "all" ||
        professor.professorProfile?.department === selectedDepartmentId;

      const titleMatch =
        professorTitleFilter === "all" ||
        professor.professorProfile?.title === professorTitleFilter;

      return nameMatch && departmentMatch && titleMatch;
    });
  }, [professors, nameSearch, selectedDepartmentId, professorTitleFilter]);

  const handleRowClick = (professor: Professor) => {
    setSelectedProfessor(professor);
    setIsEditDialogOpen(true);
  };

  // Count active filters
  const activeFiltersCount = React.useMemo(() => {
    let count = 0;
    if (selectedDepartmentId !== "all") count++;
    if (professorTitleFilter !== "all") count++;
    return count;
  }, [selectedDepartmentId, professorTitleFilter]);

  // Get selected department name for display
  const selectedDepartmentName = React.useMemo(() => {
    if (selectedDepartmentId === "all") return "All Departments";
    const department = departments.find(
      (d) => d.name === selectedDepartmentId,
    );
    return department ? department.name : "All Departments";
  }, [selectedDepartmentId, departments]);

  const availableTitles = React.useMemo(() => {
    if (!professors) return [];
    
    const titleSet = new Set(
      professors
        .map(p => p.professorProfile?.title)
        .filter((title): title is string => Boolean(title))
    );
    
    return Array.from(titleSet).sort();
  }, [professors]);

  if (professors === undefined) {
    return (
      <div className="space-y-6 sm:space-y-8">
        <div className="bg-card rounded-xl border border-border/50 shadow-sm overflow-hidden mx-1 sm:mx-0">
          <div className="p-3 sm:p-4 lg:p-6 border-b border-border/30 bg-card">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="h-8 w-48 bg-muted/60 animate-pulse rounded"></div>
                <div className="h-8 w-24 bg-muted/60 animate-pulse rounded"></div>
              </div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="flex-1 h-10 bg-muted/60 animate-pulse rounded w-full"></div>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-muted/60 animate-pulse rounded"></div>
                  <div className="h-10 w-10 bg-muted/60 animate-pulse rounded"></div>
                </div>
              </div>
            </div>
          </div>
          <div className="p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between py-4 border-b border-border/20 last:border-0">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-muted/60 animate-pulse"></div>
                  <div className="space-y-2">
                    <div className="h-4 w-40 bg-muted/60 animate-pulse rounded"></div>
                    <div className="h-3 w-24 bg-muted/60 animate-pulse rounded"></div>
                  </div>
                </div>
                <div className="h-6 w-20 bg-muted/60 animate-pulse rounded"></div>
              </div>
            ))}
          </div>
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
                {/* Filters Section */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  {/* Name Search */}
                  <div className="flex-1 w-full sm:w-auto">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search by name, employee code..."
                        value={nameSearch}
                        onChange={(e) => setNameSearch(e.target.value)}
                        className="pl-10 h-10 bg-background border-border/50 shadow-sm transition-colors focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                  </div>

                  {/* Filters Dropdown and Create Button */}
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
                          {/* Department Filter */}
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">
                              Department
                            </label>
                            <Popover
                              open={departmentSearchOpen}
                              onOpenChange={setDepartmentSearchOpen}
                            >
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  role="combobox"
                                  aria-expanded={departmentSearchOpen}
                                  className="w-full h-9 justify-between bg-background border-border/50 shadow-sm transition-colors hover:bg-accent/50"
                                >
                                  <span className="truncate">
                                    {selectedDepartmentName}
                                  </span>
                                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent
                                className="w-full p-0"
                                align="start"
                              >
                                <Command>
                                  <CommandInput
                                    placeholder="Search departments..."
                                    value={departmentSearchValue}
                                    onValueChange={setDepartmentSearchValue}
                                  />
                                  <CommandList>
                                    <CommandEmpty>
                                      No departments found.
                                    </CommandEmpty>
                                    <CommandGroup>
                                      <CommandItem
                                        value="all"
                                        onSelect={() => {
                                          setSelectedDepartmentId("all");
                                          setDepartmentSearchValue("");
                                          setDepartmentSearchOpen(false);
                                        }}
                                      >
                                        <Check
                                          className={`mr-2 h-4 w-4 ${
                                            selectedDepartmentId === "all"
                                              ? "opacity-100"
                                              : "opacity-0"
                                          }`}
                                        />
                                        All Departments
                                      </CommandItem>
                                      {departments.length === 0 ? (
                                        <CommandItem disabled>
                                          <span className="text-muted-foreground italic">No departments available</span>
                                        </CommandItem>
                                      ) : (
                                        departments.map((department) => (
                                          <CommandItem
                                            key={department._id}
                                            value={department.name}
                                            onSelect={() => {
                                              setSelectedDepartmentId(department.name);
                                              setDepartmentSearchValue(""); // Clear search after selection
                                              setDepartmentSearchOpen(false);
                                            }}
                                          >
                                            <Check
                                              className={`mr-2 h-4 w-4 ${
                                                selectedDepartmentId === department.name
                                                  ? "opacity-100"
                                                  : "opacity-0"
                                              }`}
                                            />
                                            {department.name}
                                          </CommandItem>
                                        ))
                                      )}
                                    </CommandGroup>
                                  </CommandList>
                                </Command>
                              </PopoverContent>
                            </Popover>
                          </div>

                          {/* Title Filter */}
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">
                              Academic Title
                            </label>
                            <Select
                              value={professorTitleFilter}
                              onValueChange={(value) =>
                                setProfessorTitleFilter(
                                  value as ProfessorTitleFilter,
                                )
                              }
                            >
                              <SelectTrigger className="w-full h-9 bg-background border-border/50 shadow-sm">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">All Titles</SelectItem>
                                  {availableTitles.map(title => (
                                    <SelectItem key={title} value={title || "unknown"}>
                                      {title || "Unknown"}
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Clear Filters Button */}
                          {activeFiltersCount > 0 && (
                            <div className="pt-2 border-t border-border/30">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedDepartmentId("all");
                                  setProfessorTitleFilter("all");
                                }}
                                className="w-full h-8 text-xs"
                              >
                                Clear All Filters
                              </Button>
                            </div>
                          )}
                        </div>
                      </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Create Professor Button */}
                    <Button
                      variant="default"
                      className="h-10 px-4 font-medium shadow-sm"
                      onClick={() => setIsCreateDialogOpen(true)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Data Table Section */}
        <div className="p-0">
          <DataTable
            columns={columnsProfessor}
            data={filteredProfessors}
            onRowClick={handleRowClick}
            primaryAction={null}
            mobileColumns={{
              primaryColumn: "name",
              secondaryColumn: "status",
            }}
            emptyState={{
              title: "No professors found",
              description: "No professors match the current filters.",
            }}
            entityName="professor"
          />
        </div>
      </div>

      {/* Edit Professor Dialog */}
      <ProfessorFormDialog
        mode="edit"
        professor={selectedProfessor}
        open={isEditDialogOpen}
        onOpenChange={(open) => {
          setIsEditDialogOpen(open);
          if (!open) setSelectedProfessor(undefined);
        }}
      />

      {/* Create Professor Dialog */}
      <ProfessorFormDialog
        mode="create"
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
      />
    </div>
  );
}
