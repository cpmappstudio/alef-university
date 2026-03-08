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
import { ChevronDownIcon, DotIcon } from "lucide-react";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { DataTableFilters } from "@/components/table/data-table-filters";
import { BookCard } from "@/components/library/book-card";
import { LibraryActions } from "@/components/library/library-actions";
import { LibraryCollectionBooksDialog } from "@/components/library/library-collection-books-dialog";
import { LibraryCollectionCard } from "@/components/library/library-collection-card";
import { LibraryCollectionDeleteDialog } from "@/components/library/library-collection-delete-dialog";
import { LibraryCollectionFormDialog } from "@/components/library/library-collection-form-dialog";
import { LibraryViewToggle } from "@/components/library/library-view-toggle";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { createLibraryFilters } from "@/lib/library/filter-configs";
import type {
  LibraryBookRecord,
  LibraryCatalogClientProps,
  LibraryCollectionBrowserRecord,
  LibraryCollectionTreeNode,
} from "@/lib/library/types";
import { createMultiSelectFilterFn } from "@/lib/table/filter-configs";

const VIEW_MODE_STORAGE_KEY = "library:all-books:view-mode";

type LibraryViewMode = "grid" | "collections";

type EditableCollectionState = {
  id: string;
  name: string;
};

type DeletableCollectionState = {
  id: string;
  name: string;
  childCount: number;
  bookCount: number;
};

type CollectionBooksState = {
  id: string;
  name: string;
};

function normalizeLiveBook(book: {
  id: string;
  fileName: string;
  fileSizeBytes?: number;
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
  collectionIds?: string[];
  href?: string | null;
  coverUrl?: string;
  extractionWarnings?: string[];
}): LibraryBookRecord {
  return {
    ...book,
    isFavorite: Boolean(book.isFavorite),
    href: book.href ?? undefined,
    extractionWarnings: book.extractionWarnings ?? [],
    collectionIds: book.collectionIds ?? [],
  };
}

function normalizeCollectionBrowser(
  browser: LibraryCollectionBrowserRecord | undefined,
): LibraryCollectionBrowserRecord {
  if (!browser) {
    return {
      breadcrumbs: [],
      childCollections: [],
      books: [],
    };
  }

  return {
    currentCollection: browser.currentCollection,
    breadcrumbs: browser.breadcrumbs ?? [],
    childCollections: browser.childCollections ?? [],
    books: (browser.books ?? []).map((book) => normalizeLiveBook(book)),
  };
}

export function LibraryGridClient({
  books,
  scope,
  initialCollectionBrowser,
}: LibraryCatalogClientProps) {
  const t = useTranslations("library");
  const { user } = useUser();

  const userRole = user?.publicMetadata?.role as string | undefined;
  const canManageLibrary = userRole === "admin" || userRole === "superadmin";

  const [viewMode, setViewMode] = React.useState<LibraryViewMode>("grid");
  const [activeCollectionId, setActiveCollectionId] = React.useState<
    string | null
  >(null);
  const [collectionToEdit, setCollectionToEdit] =
    React.useState<EditableCollectionState | null>(null);
  const [collectionToEditBooks, setCollectionToEditBooks] =
    React.useState<CollectionBooksState | null>(null);
  const [collectionToDelete, setCollectionToDelete] =
    React.useState<DeletableCollectionState | null>(null);

  React.useEffect(() => {
    if (scope !== "all" || typeof window === "undefined") {
      return;
    }

    const persistedMode = window.localStorage.getItem(VIEW_MODE_STORAGE_KEY);
    if (persistedMode === "grid" || persistedMode === "collections") {
      setViewMode(persistedMode);
    }
  }, [scope]);

  React.useEffect(() => {
    if (scope !== "all" || typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(VIEW_MODE_STORAGE_KEY, viewMode);
  }, [scope, viewMode]);

  const liveAllBooks = useQuery(
    api.library.getAllLibraryBooks,
    scope === "all" ? {} : "skip",
  );
  const liveMyBooks = useQuery(
    api.library.getMyLibraryBooks,
    scope === "my" ? {} : "skip",
  );
  const liveCollectionBrowser = useQuery(
    api.library.getLibraryCollectionBrowser,
    scope === "all" && viewMode === "collections"
      ? {
          collectionId: activeCollectionId
            ? (activeCollectionId as Id<"library_collections">)
            : undefined,
        }
      : "skip",
  );
  const collectionTree = useQuery(
    api.library.getLibraryCollectionsTree,
    scope === "all" ? {} : "skip",
  );

  const liveBooks = scope === "my" ? liveMyBooks : liveAllBooks;
  const resolvedBooks = React.useMemo(() => {
    if (!liveBooks) {
      return books;
    }

    return liveBooks.map((book) => normalizeLiveBook(book));
  }, [books, liveBooks]);

  const rootCollectionBrowser = React.useMemo(
    () => normalizeCollectionBrowser(initialCollectionBrowser),
    [initialCollectionBrowser],
  );
  const [collectionBrowser, setCollectionBrowser] = React.useState(
    rootCollectionBrowser,
  );

  React.useEffect(() => {
    if (scope !== "all" || viewMode !== "collections") {
      return;
    }

    if (liveCollectionBrowser === undefined) {
      if (!activeCollectionId) {
        setCollectionBrowser(rootCollectionBrowser);
      }
      return;
    }

    setCollectionBrowser(normalizeCollectionBrowser(liveCollectionBrowser));
  }, [
    activeCollectionId,
    liveCollectionBrowser,
    rootCollectionBrowser,
    scope,
    viewMode,
  ]);

  React.useEffect(() => {
    if (
      scope !== "all" ||
      viewMode !== "collections" ||
      !activeCollectionId ||
      liveCollectionBrowser === undefined
    ) {
      return;
    }

    if (!liveCollectionBrowser.currentCollection) {
      setActiveCollectionId(null);
    }
  }, [activeCollectionId, liveCollectionBrowser, scope, viewMode]);

  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  );

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
    data: resolvedBooks,
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
    () => createLibraryFilters(t, resolvedBooks),
    [resolvedBooks, t],
  );

  const searchColumn = table.getColumn("search");
  const [collectionSearchValue, setCollectionSearchValue] = React.useState("");

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

  const filteredCollectionBrowser = React.useMemo(() => {
    const normalizedSearch = collectionSearchValue.trim().toLowerCase();

    if (!normalizedSearch) {
      return collectionBrowser;
    }

    const collectionMatches = collectionBrowser.childCollections.filter(
      (collection) => collection.name.toLowerCase().includes(normalizedSearch),
    );

    const bookMatches = collectionBrowser.books.filter((book) =>
      [
        book.title,
        book.subtitle,
        book.authors.join(" "),
        book.publishers.join(" "),
        book.categories.join(" "),
        book.isbn10,
        book.isbn13,
        book.fileName,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(normalizedSearch),
    );

    return {
      ...collectionBrowser,
      childCollections: collectionMatches,
      books: bookMatches,
    };
  }, [collectionBrowser, collectionSearchValue]);

  const collectionChildrenMap = React.useMemo(() => {
    const map = new Map<string, LibraryCollectionTreeNode[]>();

    for (const collection of collectionTree ?? []) {
      const key = collection.parentId ?? "__root__";
      const siblings = map.get(key) ?? [];
      siblings.push(collection);
      map.set(key, siblings);
    }

    return map;
  }, [collectionTree]);

  const getCollectionChildren = React.useCallback(
    (collectionId?: string) =>
      collectionChildrenMap.get(collectionId ?? "__root__") ?? [],
    [collectionChildrenMap],
  );

  const handleOpenCollection = React.useCallback((collectionId: string) => {
    setActiveCollectionId(collectionId);
    setCollectionBrowser((current) => {
      const nextCollection = current.childCollections.find(
        (collection) => collection.id === collectionId,
      );

      if (!nextCollection) {
        return current;
      }

      return {
        currentCollection: {
          id: nextCollection.id,
          name: nextCollection.name,
        },
        breadcrumbs: [
          ...current.breadcrumbs,
          {
            id: nextCollection.id,
            name: nextCollection.name,
          },
        ],
        childCollections: [],
        books: [],
      };
    });
  }, []);

  const handleNavigateToCollection = React.useCallback(
    (collectionId: string) => {
      setActiveCollectionId(collectionId);
    },
    [],
  );

  const handleEditCollection = React.useCallback(
    (collection: { id: string; name: string }) => {
      setCollectionToEdit({
        id: collection.id,
        name: collection.name,
      });
    },
    [],
  );

  const handleEditBooksInCollection = React.useCallback(
    (collection: { id: string; name: string }) => {
      setCollectionToEditBooks({
        id: collection.id,
        name: collection.name,
      });
    },
    [],
  );

  const handleDeleteCollection = React.useCallback(
    (collection: { id: string; name: string; bookCount: number }) => {
      setCollectionToDelete({
        id: collection.id,
        name: collection.name,
        bookCount: collection.bookCount,
        childCount: getCollectionChildren(collection.id).length,
      });
    },
    [getCollectionChildren],
  );

  const handleOpenRoot = React.useCallback(() => {
    setActiveCollectionId(null);
    setCollectionBrowser(rootCollectionBrowser);
  }, [rootCollectionBrowser]);

  const renderBookGrid = React.useCallback(
    (items: LibraryBookRecord[]) => {
      if (items.length === 0) {
        return (
          <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
            {scope === "my"
              ? t("myBooks.emptyMessage")
              : t("allBooks.emptyMessage")}
          </div>
        );
      }

      return (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
          {items.map((book) => (
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
      );
    },
    [getLanguageLabel, getStatusLabel, scope, t],
  );

  const currentCollectionName = collectionBrowser.currentCollection?.name;
  const isCollectionBrowserLoading =
    scope === "all" &&
    viewMode === "collections" &&
    activeCollectionId !== null &&
    liveCollectionBrowser === undefined;

  if (scope === "my") {
    return (
      <>
        <div className="flex items-center gap-2 py-4">
          <Input
            placeholder={t("grid.searchPlaceholder")}
            value={(searchColumn?.getFilterValue() as string) ?? ""}
            onChange={(event) =>
              searchColumn?.setFilterValue(event.target.value)
            }
            className="min-w-0 flex-1 bg-white dark:bg-dark-gunmetal"
          />

          <div className="flex shrink-0 items-center gap-2">
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

        {renderBookGrid(filteredBooks)}
      </>
    );
  }

  return (
    <>
      {collectionToEdit && (
        <LibraryCollectionFormDialog
          mode="edit"
          collectionId={collectionToEdit.id}
          initialName={collectionToEdit.name}
          open={Boolean(collectionToEdit)}
          onOpenChange={(open) => {
            if (!open) {
              setCollectionToEdit(null);
            }
          }}
        />
      )}

      {collectionToEditBooks && (
        <LibraryCollectionBooksDialog
          collectionId={collectionToEditBooks.id}
          collectionName={collectionToEditBooks.name}
          open={Boolean(collectionToEditBooks)}
          onOpenChange={(open) => {
            if (!open) {
              setCollectionToEditBooks(null);
            }
          }}
        />
      )}

      {collectionToDelete && (
        <LibraryCollectionDeleteDialog
          collectionId={collectionToDelete.id}
          collectionName={collectionToDelete.name}
          childCount={collectionToDelete.childCount}
          bookCount={collectionToDelete.bookCount}
          open={Boolean(collectionToDelete)}
          onOpenChange={(open) => {
            if (!open) {
              setCollectionToDelete(null);
            }
          }}
        />
      )}

      {canManageLibrary && (
        <>
          <LibraryActions
            parentCollectionId={
              viewMode === "collections" ? activeCollectionId : undefined
            }
            parentCollectionName={
              viewMode === "collections" ? currentCollectionName : undefined
            }
          />
          <Separator />
        </>
      )}

      <div className="space-y-6 pt-4">
        <div className="flex items-center gap-2 py-4">
          <Input
            placeholder={t("grid.searchPlaceholder")}
            value={
              viewMode === "grid"
                ? ((searchColumn?.getFilterValue() as string) ?? "")
                : collectionSearchValue
            }
            onChange={(event) => {
              if (viewMode === "grid") {
                searchColumn?.setFilterValue(event.target.value);
                return;
              }

              setCollectionSearchValue(event.target.value);
            }}
            className="min-w-0 flex-1 bg-white dark:bg-dark-gunmetal"
          />

          <div className="flex shrink-0 items-center gap-2">
            {viewMode === "grid" && filters.length > 0 && (
              <DataTableFilters
                table={table}
                filterConfigs={filters}
                filtersMenuLabel={t("filters.title")}
              />
            )}
            <LibraryViewToggle
              value={viewMode}
              onValueChange={setViewMode}
              label={t("views.label")}
              gridLabel={t("views.grid")}
              collectionsLabel={t("views.collections")}
            />
          </div>
        </div>

        {viewMode === "grid" ? (
          <>
            <p className="mb-4 text-sm text-muted-foreground">
              {t("grid.results", { count: filteredBooks.length })}
            </p>

            {renderBookGrid(filteredBooks)}
          </>
        ) : (
          <>
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <button
                      type="button"
                      onClick={handleOpenRoot}
                      className="cursor-pointer"
                    >
                      {t("collections.root")}
                    </button>
                  </BreadcrumbLink>
                  {getCollectionChildren().length > 0 && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          className="flex items-center gap-1 text-muted-foreground transition-colors hover:text-foreground"
                          aria-label={t("collections.dropdownLabel")}
                        >
                          <ChevronDownIcon className="size-3.5" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start">
                        {getCollectionChildren().map((collection) => (
                          <DropdownMenuItem
                            key={collection.id}
                            onClick={() =>
                              handleNavigateToCollection(collection.id)
                            }
                          >
                            {collection.name}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </BreadcrumbItem>

                {collectionBrowser.breadcrumbs.map((breadcrumb, index) => {
                  const isLast =
                    index === collectionBrowser.breadcrumbs.length - 1;
                  const childCollections = getCollectionChildren(breadcrumb.id);

                  return (
                    <React.Fragment key={breadcrumb.id}>
                      <BreadcrumbSeparator>
                        <DotIcon />
                      </BreadcrumbSeparator>
                      <BreadcrumbItem>
                        {isLast ? (
                          <BreadcrumbPage>{breadcrumb.name}</BreadcrumbPage>
                        ) : (
                          <BreadcrumbLink asChild>
                            <button
                              type="button"
                              onClick={() =>
                                handleNavigateToCollection(breadcrumb.id)
                              }
                              className="cursor-pointer"
                            >
                              {breadcrumb.name}
                            </button>
                          </BreadcrumbLink>
                        )}
                        {childCollections.length > 0 && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                type="button"
                                className="flex items-center gap-1 text-muted-foreground transition-colors hover:text-foreground"
                                aria-label={`${t("collections.dropdownLabel")}: ${breadcrumb.name}`}
                              >
                                <ChevronDownIcon className="size-3.5" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start">
                              {childCollections.map((collection) => (
                                <DropdownMenuItem
                                  key={collection.id}
                                  onClick={() =>
                                    handleNavigateToCollection(collection.id)
                                  }
                                >
                                  {collection.name}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </BreadcrumbItem>
                    </React.Fragment>
                  );
                })}
              </BreadcrumbList>
            </Breadcrumb>

            {isCollectionBrowserLoading && (
              <p className="mb-6 text-sm text-muted-foreground">
                {t("collections.loading")}
              </p>
            )}

            {filteredCollectionBrowser.childCollections.length > 0 && (
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 2xl:grid-cols-4">
                {filteredCollectionBrowser.childCollections.map(
                  (collection) => (
                    <LibraryCollectionCard
                      key={collection.id}
                      collection={collection}
                      onOpen={handleOpenCollection}
                      canManage={canManageLibrary}
                      onEditBooks={handleEditBooksInCollection}
                      onEdit={handleEditCollection}
                      onDelete={handleDeleteCollection}
                      manageLabel={t("collections.menu.manage")}
                      editBooksLabel={t("collections.menu.editBooks")}
                      editLabel={t("collections.menu.edit")}
                      deleteLabel={t("collections.menu.delete")}
                    />
                  ),
                )}
              </div>
            )}

            {filteredCollectionBrowser.childCollections.length > 0 &&
              filteredCollectionBrowser.books.length > 0 && (
                <Separator className="my-8" />
              )}

            {filteredCollectionBrowser.books.length > 0 &&
              renderBookGrid(filteredCollectionBrowser.books)}

            {filteredCollectionBrowser.childCollections.length === 0 &&
              filteredCollectionBrowser.books.length === 0 && (
                <div className="rounded-xl border border-dashed p-10 text-center">
                  <p className="text-sm text-muted-foreground">
                    {collectionSearchValue.trim()
                      ? t("collections.emptySearch")
                      : activeCollectionId
                        ? t("collections.emptyCurrent")
                        : t("collections.emptyRoot")}
                  </p>
                </div>
              )}
          </>
        )}
      </div>
    </>
  );
}
