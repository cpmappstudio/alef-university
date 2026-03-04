"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import {
  ColumnDef,
  ColumnFiltersState,
  getCoreRowModel,
  getFilteredRowModel,
  useReactTable,
} from "@tanstack/react-table";

import { api } from "@/convex/_generated/api";
import { DataTableFilters } from "@/components/table/data-table-filters";
import { BookCard } from "@/components/library/book-card";
import { LibraryActions } from "@/components/library/library-actions";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { createLibraryFilters } from "@/lib/library/filter-configs";
import type {
  LibraryBookRecord,
  LibraryCatalogClientProps,
} from "@/lib/library/types";
import { createMultiSelectFilterFn } from "@/lib/table/filter-configs";

function normalizeLiveBook(book: {
  id: string;
  fileName: string;
  fileSizeBytes: number;
  isFavorite?: boolean;
  status: LibraryBookRecord["status"];
  confidence: number;
  title: string;
  subtitle?: string;
  authors: string[];
  publishers: string[];
  publishedYear?: number;
  edition?: string;
  isbn10?: string;
  isbn13?: string;
  abstract?: string;
  language?: string;
  categories: string[];
  href?: string | null;
  coverUrl?: string;
  extractionWarnings?: string[];
}): LibraryBookRecord {
  return {
    ...book,
    isFavorite: Boolean(book.isFavorite),
    href: book.href ?? undefined,
    extractionWarnings: book.extractionWarnings ?? [],
  };
}

export function LibraryGridClient({ books, scope }: LibraryCatalogClientProps) {
  const t = useTranslations("library");
  const { user } = useUser();

  const userRole = user?.publicMetadata?.role as string | undefined;
  const canManageLibrary = userRole === "admin" || userRole === "superadmin";

  const liveAllBooks = useQuery(
    api.library.getAllLibraryBooks,
    scope === "all" ? {} : "skip",
  );
  const liveMyBooks = useQuery(
    api.library.getMyLibraryBooks,
    scope === "my" ? {} : "skip",
  );

  const liveBooks = scope === "my" ? liveMyBooks : liveAllBooks;
  const resolvedBooks = React.useMemo(() => {
    if (!liveBooks) {
      return books;
    }

    return liveBooks.map((book) => normalizeLiveBook(book));
  }, [books, liveBooks]);

  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  );

  const scopedBooks = React.useMemo(() => resolvedBooks, [resolvedBooks]);

  const multiSelectFilter = React.useMemo(
    () => createMultiSelectFilterFn<LibraryBookRecord>(),
    [],
  );

  const columns = React.useMemo<ColumnDef<LibraryBookRecord>[]>(
    () => [
      {
        id: "search",
        accessorFn: (row) =>
          [
            row.title,
            row.subtitle,
            row.authors.join(" "),
            row.publishers.join(" "),
            row.categories.join(" "),
            row.isbn10,
            row.isbn13,
            row.fileName,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase(),
        enableSorting: false,
        enableHiding: false,
        enableColumnFilter: true,
      },
      {
        id: "status",
        accessorFn: (row) => row.status,
        filterFn: multiSelectFilter,
        enableColumnFilter: true,
      },
      {
        id: "language",
        accessorFn: (row) => (row.language ?? "").toLowerCase(),
        filterFn: multiSelectFilter,
        enableColumnFilter: true,
      },
      {
        id: "category",
        accessorFn: (row) => row.categories[0] ?? "",
        filterFn: multiSelectFilter,
        enableColumnFilter: true,
      },
    ],
    [multiSelectFilter],
  );

  const table = useReactTable({
    data: scopedBooks,
    columns,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      columnFilters,
    },
  });

  const filteredBooks = table
    .getFilteredRowModel()
    .rows.map((row) => row.original);

  const filters = React.useMemo(
    () => createLibraryFilters(t, scopedBooks),
    [scopedBooks, t],
  );

  const searchColumn = table.getColumn("search");

  const getStatusLabel = React.useCallback(
    (status: LibraryBookRecord["status"]) =>
      t(`filters.statusValues.${status}`),
    [t],
  );

  const getLanguageLabel = React.useCallback(
    (language?: string) => {
      const normalized = (language ?? "").trim().toLowerCase();

      if (!normalized) {
        return undefined;
      }

      if (normalized === "es") {
        return t("filters.languageValues.es");
      }

      if (normalized === "en") {
        return t("filters.languageValues.en");
      }

      return normalized.toUpperCase();
    },
    [t],
  );

  return (
    <>
      {scope === "all" && canManageLibrary && (
        <>
          <LibraryActions />
          <Separator />
        </>
      )}

      <div className="flex items-center gap-2 py-4">
        <Input
          placeholder={t("grid.searchPlaceholder")}
          value={(searchColumn?.getFilterValue() as string) ?? ""}
          onChange={(event) => searchColumn?.setFilterValue(event.target.value)}
          className="max-w-sm bg-white dark:bg-dark-gunmetal"
        />

        <div className="ml-auto flex items-center gap-2">
          {filters.length > 0 && (
            <DataTableFilters
              table={table}
              filterConfigs={filters}
              filtersMenuLabel={t("filters.title")}
            />
          )}
        </div>
      </div>

      <p className="mb-4 text-sm text-muted-foreground">
        {t("grid.results", { count: filteredBooks.length })}
      </p>

      {filteredBooks.length > 0 ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
          {filteredBooks.map((book) => (
            <BookCard
              key={book.id}
              book={book}
              statusLabel={getStatusLabel(book.status)}
              languageLabel={getLanguageLabel(book.language)}
              unknownAuthorLabel={t("grid.unknownAuthor")}
              openBookLabel={t("grid.viewDetails")}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
          {scope === "my"
            ? t("myBooks.emptyMessage")
            : t("allBooks.emptyMessage")}
        </div>
      )}
    </>
  );
}
