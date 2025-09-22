"use client";
import * as React from "react";
import { ChevronDown, Plus } from "lucide-react";

import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ProgramFormDialog } from "../admin/program/program-form-dialog";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  onRowClick?: (row: TData) => void;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  onRowClick,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
    state: {
      sorting,
      columnFilters,
      columnVisibility,
    },
  });

  return (
    <div className="w-full max-w-full space-y-6">
      {/* Controls Section */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 bg-muted/30 rounded-lg">
        <div className="flex-1">
          <Input
            placeholder="Search programs..."
            value={(table.getColumn("nameEs")?.getFilterValue() as string) ?? ""}
            onChange={(event) =>
              table.getColumn("nameEs")?.setFilterValue(event.target.value)
            }
            className="max-w-sm bg-background border-border focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
          />
        </div>
        {/* <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="default" 
              className="shrink-0 border-border hover:bg-muted/80 transition-colors duration-200"
            >
              <span className="mr-2">Columns</span>
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 bg-background border-border shadow-lg">
            {table
              .getAllColumns()
              .filter((column) => column.getCanHide())
              .map((column) => {
                return (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    className="capitalize hover:bg-muted/80 transition-colors duration-200"
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) =>
                      column.toggleVisibility(!!value)
                    }
                  >
                    {column.id}
                  </DropdownMenuCheckboxItem>
                );
              })}
          </DropdownMenuContent>
        </DropdownMenu> */}
        <ProgramFormDialog
                  mode="create"
                  trigger={
                    <Button variant="default">
                      <Plus className="h-5 w-5" />
                      Create Program
                    </Button>
                  }
                />
      </div>

      {/* Table Section */}
      <div className="w-full overflow-hidden rounded-lg border border-border bg-background shadow-sm">
        <Table className="w-full table-fixed lg:table-auto min-w-full">
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow 
                key={headerGroup.id}
                className="bg-deep-koamaru border-b border-border"
              >
                {headerGroup.headers.map((header) => {
                  // Hide columns on mobile and tablet except name and status
                  const isHiddenOnMobile = header.column.id !== 'nameEs' && header.column.id !== 'isActive';
                  return (
                    <TableHead 
                      key={header.id}
                      className={`font-semibold text-white py-2 px-3 lg:py-4 lg:px-6 text-left ${
                        isHiddenOnMobile ? 'hidden lg:table-cell' : ''
                      } ${
                        header.column.id === 'nameEs' ? 'w-2/3 md:w-3/4 lg:w-auto' : ''
                      } ${
                        header.column.id === 'isActive' ? 'w-1/3 md:w-1/4 lg:w-auto' : ''
                      }`}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row, index) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className={`
                    border-b border-border/50 last:border-b-0
                    ${index % 2 === 0 ? 'bg-background' : 'bg-muted/10'}
                    ${onRowClick ? 'cursor-pointer hover:bg-muted/20' : ''}
                  `}
                  onClick={() => onRowClick?.(row.original)}
                >
                  {row.getVisibleCells().map((cell) => {
                    // Hide columns on mobile and tablet except name and status
                    const isHiddenOnMobile = cell.column.id !== 'nameEs' && cell.column.id !== 'isActive';
                    return (
                      <TableCell 
                        key={cell.id} 
                        className={`py-2 px-3 lg:py-4 lg:px-6 ${
                          isHiddenOnMobile ? 'hidden lg:table-cell' : ''
                        } ${
                          cell.column.id === 'nameEs' ? 'w-2/3 md:w-3/4 lg:w-auto min-w-0 lg:min-w-max' : ''
                        } ${
                          cell.column.id === 'isActive' ? 'w-1/3 md:w-1/4 lg:w-auto' : ''
                        }`}
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-32 text-center py-8"
                >
                  <div className="flex flex-col items-center space-y-3 text-muted-foreground">
                    <div className="space-y-1">
                      <p className="font-medium">No programs found</p>
                      <p className="text-sm">Try adjusting your search or create a new program</p>
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Section */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-muted/30 rounded-lg">
        <div className="text-sm text-muted-foreground font-medium">
          <span>
            Showing {table.getRowModel().rows.length} of {table.getFilteredRowModel().rows.length} programs
          </span>
        </div>
        <div className="flex items-center space-x-3">
          <Button
            variant="default"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </Button>
          <div className="text-sm font-medium text-muted-foreground px-2">
            Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
          </div>
          <Button
            variant="default"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
