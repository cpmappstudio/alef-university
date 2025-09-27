"use client";
import * as React from "react";

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
interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  onRowClick?: (row: TData) => void;
  // Search configuration
  searchConfig: {
    placeholder: string;
    columnKey: string;
  };
  // Primary action (create button)
  primaryAction: React.ReactNode;
  // Mobile responsive columns
  mobileColumns: {
    primaryColumn: string;
    secondaryColumn: string;
  };
  // Empty state configuration
  emptyState: {
    title: string;
    description: string;
  };
  // Entity name for pagination info
  entityName: string;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  onRowClick,
  searchConfig,
  primaryAction,
  mobileColumns,
  emptyState,
  entityName,
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
    <div className="w-full space-y-6">
      {/* Controls Section */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-3 sm:p-4 rounded-lg">
        <div className="flex-1 w-full sm:w-auto">
          <Input
            placeholder={searchConfig.placeholder}
            value={(table.getColumn(searchConfig.columnKey)?.getFilterValue() as string) ?? ""}
            onChange={(event) =>
              table.getColumn(searchConfig.columnKey)?.setFilterValue(event.target.value)
            }
            className="w-full sm:max-w-sm bg-background border-border focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
          />
        </div>
        {primaryAction}
      </div>

      {/* Table Section */}
      <div className="w-full overflow-x-auto rounded-lg border border-border bg-background shadow-sm">
        <Table className="w-full min-w-full">
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow 
                key={headerGroup.id}
                className="bg-deep-koamaru border-b border-border"
              >
                {headerGroup.headers.map((header) => {
                  // Hide columns on mobile and tablet except the specified mobile columns
                  const isHiddenOnMobile = header.column.id !== mobileColumns.primaryColumn && header.column.id !== mobileColumns.secondaryColumn;
                  return (
                    <TableHead 
                      key={header.id}
                      className={`font-semibold text-white py-2 px-2 sm:px-3 lg:py-4 lg:px-6 text-left ${
                        isHiddenOnMobile ? 'hidden lg:table-cell' : ''
                      } ${
                        header.column.id === mobileColumns.primaryColumn ? 'w-[65%] sm:w-2/3 md:w-3/4 lg:w-auto' : ''
                      } ${
                        header.column.id === mobileColumns.secondaryColumn ? 'w-[35%] sm:w-1/3 md:w-1/4 lg:w-auto' : ''
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
                    // Hide columns on mobile and tablet except the specified mobile columns
                    const isHiddenOnMobile = cell.column.id !== mobileColumns.primaryColumn && cell.column.id !== mobileColumns.secondaryColumn;
                    return (
                      <TableCell 
                        key={cell.id} 
                        className={`py-2 px-2 sm:px-3 lg:py-4 lg:px-6 break-words ${
                          isHiddenOnMobile ? 'hidden lg:table-cell' : ''
                        } ${
                          cell.column.id === mobileColumns.primaryColumn ? 'w-[65%] sm:w-2/3 md:w-3/4 lg:w-auto min-w-0' : ''
                        } ${
                          cell.column.id === mobileColumns.secondaryColumn ? 'w-[35%] sm:w-1/3 md:w-1/4 lg:w-auto text-right sm:text-left' : ''
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
                      <p className="font-medium">{emptyState.title}</p>
                      <p className="text-sm">{emptyState.description}</p>
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Section */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-3 sm:p-4 bg-muted/30 rounded-lg">
        <div className="text-sm text-muted-foreground font-medium">
          <span>
            Showing {table.getRowModel().rows.length} of {table.getFilteredRowModel().rows.length} {entityName}
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
