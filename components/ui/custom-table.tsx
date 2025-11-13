"use client";

import * as React from "react";

import {
  ColumnDef,
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

import { ChevronDown } from "lucide-react";

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

const INTERACTIVE_TARGET_SELECTOR = [
  "a",
  "button",
  "[role=button]",
  "[role=menuitem]",
  "[role=link]",
  "[role=checkbox]",
  "[role=switch]",
  "[role=tab]",
  "[role=option]",
  "[role=listbox]",
  "input",
  "textarea",
  "select",
  "label",
  "summary",
  "[data-interactive]",
  "[data-row-interactive]",
  "[data-prevent-row-click]",
  "[contenteditable]",
].join(",");

type CustomTableProps<TData> = {
  data: TData[] | undefined;
  columns: ColumnDef<TData, unknown>[];
  filterColumn?: string;
  filterPlaceholder?: string;
  emptyMessage?: string;
  columnsMenuLabel?: string;
  onRowClick?: (row: TData) => void;
};

export default function CustomTable<TData>({
  data,
  columns,
  filterColumn,
  filterPlaceholder = "Filter...",
  emptyMessage = "No results.",
  columnsMenuLabel = "Columns",
  onRowClick,
}: CustomTableProps<TData>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);

  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  );

  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});

  const [rowSelection, setRowSelection] = React.useState({});

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

  return (
    <div className="w-full">
      <div className="flex items-center py-4 gap-2">
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
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className="ml-auto bg-white dark:bg-dark-gunmetal"
            >
              {columnsMenuLabel} <ChevronDown />
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
                  onCheckedChange={(value) => column.toggleVisibility(!!value)}
                >
                  {column.id}
                </DropdownMenuCheckboxItem>
              ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="overflow-hidden rounded-md border">
        <Table className="bg-white dark:bg-dark-gunmetal">
          <TableHeader className="bg-deep-koamaru ">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="text-white ">
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
            {table.getRowModel().rows?.length ? (
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
                      ? (event) => {
                          if (event.defaultPrevented) {
                            return;
                          }

                          const nativeEvent = event.nativeEvent;

                          const target = event.target;
                          const elementTarget =
                            target instanceof Element ? target : null;

                          if (
                            nativeEvent.button !== 0 ||
                            nativeEvent.metaKey ||
                            nativeEvent.ctrlKey ||
                            nativeEvent.shiftKey ||
                            nativeEvent.altKey ||
                            elementTarget?.closest(
                              INTERACTIVE_TARGET_SELECTOR,
                            ) ||
                            (elementTarget instanceof HTMLElement &&
                              elementTarget.isContentEditable)
                          ) {
                            return;
                          }

                          onRowClick(row.original);
                        }
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
        <div className="text-muted-foreground flex-1 text-sm">
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
