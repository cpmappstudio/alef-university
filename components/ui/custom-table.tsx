// ################################################################################
// # File: custom-table.tsx                                                       #
// # Check: 11/15/2025                                                            #
// ################################################################################
"use client";

/* hooks */
import * as React from "react";
import { useTranslations } from "next-intl";

/* components */
import {
  ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
  VisibilityState,
} from "@tanstack/react-table";
import { Columns3CogIcon, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { CustomTableProps } from "@/lib/table/types";
import { shouldHandleRowClick } from "@/lib/table/utils";

// Configuration
const PAGE_SIZE = 70;

export default function CustomTable<TData>({
  data,
  columns,
  filterColumn,
  filterPlaceholder = "Filter...",
  emptyMessage = "No results.",
  columnsMenuLabel = "Columns",
  exportButtonLabel,
  onExport,
  onRowClick,
}: CustomTableProps<TData>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({
      search: false, // Ocultar columna de búsqueda (solo para filtrado)
    });
  const [rowSelection, setRowSelection] = React.useState({});

  const t = useTranslations("common");
  const resolvedExportLabel = exportButtonLabel ?? t("export");

  const table = useReactTable({
    data: data ?? [],
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    initialState: {
      pagination: {
        pageSize: PAGE_SIZE,
      },
    },
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
  });

  const filterColumnInstance = filterColumn
    ? table.getColumn(filterColumn)
    : undefined;

  const handleRowClick = React.useCallback(
    (rowData: TData) => {
      onRowClick?.(rowData);
    },
    [onRowClick],
  );

  const handleRowContainerClick = React.useCallback(
    (
      event: React.MouseEvent<HTMLTableRowElement, MouseEvent>,
      rowData: TData,
    ) => {
      if (!onRowClick || !shouldHandleRowClick(event)) {
        return;
      }

      handleRowClick(rowData);
    },
    [handleRowClick, onRowClick],
  );

  const exportRows = React.useCallback(() => {
    if (!onExport) {
      return;
    }

    const rows = table
      .getFilteredRowModel()
      .rows.map((row) => row.original as TData);

    onExport(rows);
  }, [onExport, table]);

  return (
    <div className="w-full">
      <div className="flex items-center gap-2 py-4">
        {filterColumnInstance ? (
          <Input
            placeholder={filterPlaceholder}
            value={(filterColumnInstance.getFilterValue() as string) ?? ""}
            onChange={(event) =>
              filterColumnInstance.setFilterValue(event.target.value)
            }
            className="max-w-sm bg-white dark:bg-dark-gunmetal"
          />
        ) : null}
        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="outline"
            className="bg-white dark:bg-dark-gunmetal disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={exportRows}
            disabled={!onExport}
          >
            <span className="hidden md:block mr-1">{resolvedExportLabel}</span>
            <Download className="size-3.5" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="bg-white dark:bg-dark-gunmetal cursor-pointer"
              >
                <span className="hidden md:block mr-1">{columnsMenuLabel}</span>
                <Columns3CogIcon />
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end">
              {table
                .getAllColumns()
                .filter((column) => column.getCanHide())
                .map((column) => (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    className="capitalize"
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) =>
                      column.toggleVisibility(!!value)
                    }
                  >
                    {column.id}
                  </DropdownMenuCheckboxItem>
                ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="overflow-hidden rounded-md border">
        <Table className="bg-white dark:bg-dark-gunmetal">
          <TableHeader className="bg-deep-koamaru">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="text-white">
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>

          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className={
                    onRowClick
                      ? "cursor-pointer transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                      : undefined
                  }
                  onClick={
                    onRowClick
                      ? (event) => handleRowContainerClick(event, row.original)
                      : undefined
                  }
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-end space-x-2 py-4">
        <div className="flex-1 text-sm text-muted-foreground">
          {table.getFilteredSelectedRowModel().rows.length} of{" "}
          {table.getFilteredRowModel().rows.length} row(s) selected.
        </div>

        <div className="space-x-2">
          <Button
            className="bg-white dark:bg-dark-gunmetal"
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </Button>

          <Button
            className="bg-white dark:bg-dark-gunmetal"
            variant="outline"
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
