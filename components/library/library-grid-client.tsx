"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useUser } from "@clerk/nextjs";
import { usePaginatedQuery, useQuery } from "convex/react";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { LibraryActions } from "@/components/library/library-actions";
import { LibraryBookGrid } from "@/components/library/library-book-grid";
import { LibraryCollectionBooksDialog } from "@/components/library/library-collection-books-dialog";
import { LibraryCollectionDeleteDialog } from "@/components/library/library-collection-delete-dialog";
import { LibraryCollectionFormDialog } from "@/components/library/library-collection-form-dialog";
import { LibraryCollectionsBrowser } from "@/components/library/library-collections-browser";
import { LibraryFiltersMenu } from "@/components/library/library-filters-menu";
import { LibraryViewToggle } from "@/components/library/library-view-toggle";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import type {
  LibraryBookRecord,
  LibraryCatalogClientProps,
  LibraryCatalogFilterOptions,
  LibraryCollectionBrowserRecord,
} from "@/lib/library/types";
import {
  buildLibraryViewModeCookieValue,
  LIBRARY_VIEW_MODE_COOKIE_NAME,
  LIBRARY_VIEW_MODE_STORAGE_KEY,
  parseLibraryViewMode,
  type LibraryViewMode,
} from "@/lib/library/view-mode";

const GRID_PAGE_SIZE = 24;
const EMPTY_FILTER_OPTIONS: LibraryCatalogFilterOptions = {
  languages: [],
  categories: [],
};

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
    };
  }

  return {
    currentCollection: browser.currentCollection,
    breadcrumbs: browser.breadcrumbs ?? [],
    childCollections: browser.childCollections ?? [],
  };
}

export function LibraryGridClient({
  initialBooks,
  scope,
  initialViewMode = "grid",
}: LibraryCatalogClientProps) {
  const t = useTranslations("library");
  const { user } = useUser();

  const userRole = user?.publicMetadata?.role as string | undefined;
  const canManageLibrary = userRole === "admin" || userRole === "superadmin";

  const [viewMode, setViewMode] = React.useState<LibraryViewMode>(
    scope === "all" ? initialViewMode : "grid",
  );
  const [activeCollectionId, setActiveCollectionId] = React.useState<
    string | null
  >(null);
  const [collectionToEdit, setCollectionToEdit] =
    React.useState<EditableCollectionState | null>(null);
  const [collectionToEditBooks, setCollectionToEditBooks] =
    React.useState<CollectionBooksState | null>(null);
  const [collectionToDelete, setCollectionToDelete] =
    React.useState<DeletableCollectionState | null>(null);
  const [gridSearchValue, setGridSearchValue] = React.useState("");
  const [collectionSearchValue, setCollectionSearchValue] = React.useState("");
  const [selectedStatuses, setSelectedStatuses] = React.useState<
    LibraryBookRecord["status"][]
  >([]);
  const [selectedLanguages, setSelectedLanguages] = React.useState<string[]>(
    [],
  );
  const [selectedCategories, setSelectedCategories] = React.useState<string[]>(
    [],
  );

  React.useEffect(() => {
    if (scope !== "all" || typeof window === "undefined") {
      return;
    }

    const cookieValue = document.cookie
      .split("; ")
      .find((entry) => entry.startsWith(`${LIBRARY_VIEW_MODE_COOKIE_NAME}=`))
      ?.split("=")[1];

    if (parseLibraryViewMode(cookieValue)) {
      return;
    }

    const persistedMode = parseLibraryViewMode(
      window.localStorage.getItem(LIBRARY_VIEW_MODE_STORAGE_KEY),
    );
    if (persistedMode) {
      setViewMode(persistedMode);
    }
  }, [scope]);

  React.useEffect(() => {
    if (scope !== "all" || typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(LIBRARY_VIEW_MODE_STORAGE_KEY, viewMode);
    document.cookie = buildLibraryViewModeCookieValue(viewMode);
  }, [scope, viewMode]);

  const deferredGridSearch = React.useDeferredValue(gridSearchValue.trim());
  const deferredCollectionSearch = React.useDeferredValue(
    collectionSearchValue.trim(),
  );

  const gridQueryArgs = React.useMemo(
    () => ({
      search: deferredGridSearch || undefined,
      statuses: selectedStatuses.length > 0 ? selectedStatuses : undefined,
      languages: selectedLanguages.length > 0 ? selectedLanguages : undefined,
      categories:
        selectedCategories.length > 0 ? selectedCategories : undefined,
    }),
    [
      deferredGridSearch,
      selectedCategories,
      selectedLanguages,
      selectedStatuses,
    ],
  );
  const isInitialGridQuery =
    !gridQueryArgs.search &&
    !gridQueryArgs.statuses &&
    !gridQueryArgs.languages &&
    !gridQueryArgs.categories;

  const allBooksPage = usePaginatedQuery(
    api.library.getAllLibraryBooksPage,
    scope === "all" && viewMode === "grid" ? gridQueryArgs : "skip",
    { initialNumItems: GRID_PAGE_SIZE },
  );
  const myBooksPage = usePaginatedQuery(
    api.library.getMyLibraryBooksPage,
    scope === "my" ? gridQueryArgs : "skip",
    { initialNumItems: GRID_PAGE_SIZE },
  );
  const collectionBooksPage = usePaginatedQuery(
    api.library.getLibraryCollectionBooksPage,
    scope === "all" && viewMode === "collections" && activeCollectionId
      ? {
          collectionId: activeCollectionId as Id<"library_collections">,
          search: deferredCollectionSearch || undefined,
        }
      : "skip",
    { initialNumItems: GRID_PAGE_SIZE },
  );
  const gridPage = scope === "my" ? myBooksPage : allBooksPage;

  const catalogFilterOptions = useQuery(
    api.library.getLibraryCatalogFilterOptions,
    scope === "my" || viewMode === "grid" ? {} : "skip",
  );
  const collectionBrowserQueryArgs = React.useMemo(() => {
    if (scope !== "all" || viewMode !== "collections") {
      return "skip" as const;
    }

    return activeCollectionId
      ? {
          collectionId: activeCollectionId as Id<"library_collections">,
        }
      : {};
  }, [activeCollectionId, scope, viewMode]);
  const liveCollectionBrowser = useQuery(
    api.library.getLibraryCollectionBrowser,
    collectionBrowserQueryArgs,
  );
  const collectionTree = useQuery(
    api.library.getLibraryCollectionsTree,
    scope === "all" && viewMode === "collections" ? {} : "skip",
  );

  const rootCollectionBrowser = React.useMemo(
    () => normalizeCollectionBrowser(undefined),
    [],
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

      return language?.trim() || normalized.toUpperCase();
    },
    [t],
  );

  const resolvedFilterOptions =
    React.useMemo<LibraryCatalogFilterOptions>(() => {
      const source = catalogFilterOptions ?? EMPTY_FILTER_OPTIONS;

      return {
        languages: source.languages.map((option) => ({
          value: option.value,
          label: getLanguageLabel(option.label) ?? option.label,
        })),
        categories: source.categories,
      };
    }, [catalogFilterOptions, getLanguageLabel]);

  const liveGridBooks = React.useMemo(
    () => gridPage.results.map((book) => normalizeLiveBook(book)),
    [gridPage.results],
  );
  const shouldUseInitialBooks =
    isInitialGridQuery &&
    gridPage.status === "LoadingFirstPage" &&
    initialBooks.length > 0;
  const gridBooks = shouldUseInitialBooks ? initialBooks : liveGridBooks;
  const isGridLoadingFirstPage =
    gridPage.status === "LoadingFirstPage" && !shouldUseInitialBooks;
  const isGridLoadingMore = gridPage.status === "LoadingMore";
  const canLoadMoreGridBooks = gridPage.status === "CanLoadMore";
  const isGridExhausted = gridPage.status === "Exhausted";
  const gridResultsLabel = isGridExhausted
    ? t("grid.results", { count: gridBooks.length })
    : t("grid.showingResults", { count: gridBooks.length });

  const collectionBooks = React.useMemo(
    () => collectionBooksPage.results.map((book) => normalizeLiveBook(book)),
    [collectionBooksPage.results],
  );
  const isCollectionBooksLoadingFirstPage =
    collectionBooksPage.status === "LoadingFirstPage" &&
    Boolean(activeCollectionId);
  const isCollectionBooksLoadingMore =
    collectionBooksPage.status === "LoadingMore";
  const canLoadMoreCollectionBooks =
    collectionBooksPage.status === "CanLoadMore";

  const filterSections = React.useMemo(
    () =>
      [
        {
          id: "status",
          label: t("filters.status"),
          options: [
            { value: "ok", label: t("filters.statusValues.ok") },
            {
              value: "needs_review",
              label: t("filters.statusValues.needs_review"),
            },
            { value: "failed", label: t("filters.statusValues.failed") },
          ],
          values: selectedStatuses,
          onChange: (values: string[]) =>
            setSelectedStatuses(values as LibraryBookRecord["status"][]),
        },
        {
          id: "language",
          label: t("filters.language"),
          options: resolvedFilterOptions.languages,
          values: selectedLanguages,
          onChange: setSelectedLanguages,
        },
        {
          id: "category",
          label: t("filters.category"),
          options: resolvedFilterOptions.categories,
          values: selectedCategories,
          onChange: setSelectedCategories,
        },
      ].filter((section) => section.options.length > 0),
    [
      resolvedFilterOptions.categories,
      resolvedFilterOptions.languages,
      selectedCategories,
      selectedLanguages,
      selectedStatuses,
      t,
    ],
  );

  const handleEditCollection = React.useCallback(
    (collection: { id: string; name: string }) => {
      setCollectionToEdit(collection);
    },
    [],
  );

  const handleEditBooksInCollection = React.useCallback(
    (collection: { id: string; name: string }) => {
      setCollectionToEditBooks(collection);
    },
    [],
  );

  const handleDeleteCollection = React.useCallback(
    (collection: { id: string; name: string; bookCount: number }) => {
      const childCount = collectionTree?.filter(
        (item) => item.parentId === collection.id,
      ).length;

      setCollectionToDelete({
        id: collection.id,
        name: collection.name,
        bookCount: collection.bookCount,
        childCount: childCount ?? 0,
      });
    },
    [collectionTree],
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
      };
    });
  }, []);

  const handleNavigateToCollection = React.useCallback(
    (collectionId: string) => {
      setActiveCollectionId(collectionId);
    },
    [],
  );

  const handleOpenRoot = React.useCallback(() => {
    setActiveCollectionId(null);
    setCollectionBrowser((current) => {
      if (!activeCollectionId) {
        return liveCollectionBrowser
          ? normalizeCollectionBrowser(liveCollectionBrowser)
          : current;
      }

      return rootCollectionBrowser;
    });
  }, [activeCollectionId, liveCollectionBrowser, rootCollectionBrowser]);

  const handleClearGridFilters = React.useCallback(() => {
    setSelectedStatuses([]);
    setSelectedLanguages([]);
    setSelectedCategories([]);
  }, []);

  const currentCollectionName = collectionBrowser.currentCollection?.name;
  const isCollectionBrowserLoading =
    scope === "all" &&
    viewMode === "collections" &&
    liveCollectionBrowser === undefined;

  const gridControls = (
    <div className="flex items-center gap-2 py-4">
      <Input
        placeholder={t("grid.searchPlaceholder")}
        value={viewMode === "grid" ? gridSearchValue : collectionSearchValue}
        onChange={(event) => {
          if (viewMode === "grid") {
            setGridSearchValue(event.target.value);
            return;
          }

          setCollectionSearchValue(event.target.value);
        }}
        className="min-w-0 flex-1 bg-white dark:bg-dark-gunmetal"
      />

      <div className="flex shrink-0 items-center gap-2">
        {viewMode === "grid" && filterSections.length > 0 && (
          <LibraryFiltersMenu
            sections={filterSections}
            buttonLabel={t("filters.title")}
            filterByLabel={t("filters.filterBy")}
            clearAllLabel={t("filters.clearAll")}
            onClearAll={handleClearGridFilters}
          />
        )}
        {scope === "all" && (
          <LibraryViewToggle
            value={viewMode}
            onValueChange={setViewMode}
            label={t("views.label")}
            gridLabel={t("views.grid")}
            collectionsLabel={t("views.collections")}
          />
        )}
      </div>
    </div>
  );

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

      {scope === "all" && canManageLibrary && (
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
        {gridControls}

        {scope === "my" || viewMode === "grid" ? (
          <>
            <p className="mb-4 text-sm text-muted-foreground">
              {gridResultsLabel}
            </p>
            <LibraryBookGrid
              books={gridBooks}
              isLoadingFirstPage={isGridLoadingFirstPage}
              isLoadingMore={isGridLoadingMore}
              canLoadMore={canLoadMoreGridBooks}
              onLoadMore={() => gridPage.loadMore(GRID_PAGE_SIZE)}
              emptyMessage={
                scope === "my"
                  ? t("myBooks.emptyMessage")
                  : t("allBooks.emptyMessage")
              }
              loadingMessage={t("grid.loading")}
              loadMoreLabel={t("grid.loadMore")}
              loadingMoreLabel={t("grid.loadingMore")}
              unknownAuthorLabel={t("grid.unknownAuthor")}
              openBookLabel={t("grid.viewDetails")}
              getStatusLabel={getStatusLabel}
              getLanguageLabel={getLanguageLabel}
            />
          </>
        ) : (
          <LibraryCollectionsBrowser
            activeCollectionId={activeCollectionId}
            browser={collectionBrowser}
            collectionTree={collectionTree}
            searchValue={collectionSearchValue}
            childCollectionsLoading={isCollectionBrowserLoading}
            books={collectionBooks}
            isBooksLoadingFirstPage={isCollectionBooksLoadingFirstPage}
            isBooksLoadingMore={isCollectionBooksLoadingMore}
            canLoadMoreBooks={canLoadMoreCollectionBooks}
            onLoadMoreBooks={() => collectionBooksPage.loadMore(GRID_PAGE_SIZE)}
            canManage={canManageLibrary}
            onOpenRoot={handleOpenRoot}
            onNavigateToCollection={handleNavigateToCollection}
            onOpenCollection={handleOpenCollection}
            onEditBooksInCollection={handleEditBooksInCollection}
            onEditCollection={handleEditCollection}
            onDeleteCollection={handleDeleteCollection}
            labels={{
              root: t("collections.root"),
              dropdownLabel: t("collections.dropdownLabel"),
              loading: t("collections.loading"),
              emptyRoot: t("collections.emptyRoot"),
              emptyCurrent: t("collections.emptyCurrent"),
              emptySearch: t("collections.emptySearch"),
              manage: t("collections.menu.manage"),
              editBooks: t("collections.menu.editBooks"),
              edit: t("collections.menu.edit"),
              delete: t("collections.menu.delete"),
              gridEmpty: t("collections.emptyCurrent"),
              gridLoading: t("grid.loading"),
              gridLoadMore: t("grid.loadMore"),
              gridLoadingMore: t("grid.loadingMore"),
              unknownAuthor: t("grid.unknownAuthor"),
              openBook: t("grid.viewDetails"),
            }}
            getStatusLabel={getStatusLabel}
            getLanguageLabel={getLanguageLabel}
          />
        )}
      </div>
    </>
  );
}
