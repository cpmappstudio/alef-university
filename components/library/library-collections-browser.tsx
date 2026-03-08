"use client";

import * as React from "react";
import { ChevronDownIcon, DotIcon } from "lucide-react";

import { LibraryBookGrid } from "@/components/library/library-book-grid";
import { LibraryCollectionCard } from "@/components/library/library-collection-card";
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
import { Separator } from "@/components/ui/separator";
import type {
  LibraryBookRecord,
  LibraryCollectionBrowserRecord,
  LibraryCollectionTreeNode,
} from "@/lib/library/types";

type LibraryCollectionsBrowserProps = {
  activeCollectionId: string | null;
  browser: LibraryCollectionBrowserRecord;
  collectionTree?: LibraryCollectionTreeNode[];
  searchValue: string;
  childCollectionsLoading?: boolean;
  books: LibraryBookRecord[];
  isBooksLoadingFirstPage?: boolean;
  isBooksLoadingMore?: boolean;
  canLoadMoreBooks?: boolean;
  onLoadMoreBooks?: () => void;
  canManage?: boolean;
  onOpenRoot: () => void;
  onNavigateToCollection: (collectionId: string) => void;
  onOpenCollection: (collectionId: string) => void;
  onEditBooksInCollection?: (collection: { id: string; name: string }) => void;
  onEditCollection?: (collection: { id: string; name: string }) => void;
  onDeleteCollection?: (collection: {
    id: string;
    name: string;
    bookCount: number;
  }) => void;
  labels: {
    root: string;
    dropdownLabel: string;
    loading: string;
    emptyRoot: string;
    emptyCurrent: string;
    emptySearch: string;
    manage: string;
    editBooks: string;
    edit: string;
    delete: string;
    gridEmpty: string;
    gridLoading: string;
    gridLoadMore: string;
    gridLoadingMore: string;
    unknownAuthor: string;
    openBook: string;
  };
  getStatusLabel: (status: LibraryBookRecord["status"]) => string;
  getLanguageLabel: (language?: string) => string | undefined;
};

export function LibraryCollectionsBrowser({
  activeCollectionId,
  browser,
  collectionTree,
  searchValue,
  childCollectionsLoading = false,
  books,
  isBooksLoadingFirstPage = false,
  isBooksLoadingMore = false,
  canLoadMoreBooks = false,
  onLoadMoreBooks,
  canManage = false,
  onOpenRoot,
  onNavigateToCollection,
  onOpenCollection,
  onEditBooksInCollection,
  onEditCollection,
  onDeleteCollection,
  labels,
  getStatusLabel,
  getLanguageLabel,
}: LibraryCollectionsBrowserProps) {
  const filteredChildCollections = React.useMemo(() => {
    const normalizedSearch = searchValue.trim().toLowerCase();

    if (!normalizedSearch) {
      return browser.childCollections;
    }

    return browser.childCollections.filter((collection) =>
      collection.name.toLowerCase().includes(normalizedSearch),
    );
  }, [browser.childCollections, searchValue]);

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

  const isSearching = searchValue.trim().length > 0;
  const hasChildCollections = filteredChildCollections.length > 0;
  const hasBooks = books.length > 0;
  const showEmptyState =
    !childCollectionsLoading &&
    !hasChildCollections &&
    !hasBooks &&
    !isBooksLoadingFirstPage;

  return (
    <>
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <button
                type="button"
                onClick={onOpenRoot}
                className="cursor-pointer"
              >
                {labels.root}
              </button>
            </BreadcrumbLink>
            {getCollectionChildren().length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="flex items-center gap-1 text-muted-foreground transition-colors hover:text-foreground"
                    aria-label={labels.dropdownLabel}
                  >
                    <ChevronDownIcon className="size-3.5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  {getCollectionChildren().map((collection) => (
                    <DropdownMenuItem
                      key={collection.id}
                      onClick={() => onNavigateToCollection(collection.id)}
                    >
                      {collection.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </BreadcrumbItem>

          {browser.breadcrumbs.map((breadcrumb, index) => {
            const isLast = index === browser.breadcrumbs.length - 1;
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
                        onClick={() => onNavigateToCollection(breadcrumb.id)}
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
                          aria-label={`${labels.dropdownLabel}: ${breadcrumb.name}`}
                        >
                          <ChevronDownIcon className="size-3.5" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start">
                        {childCollections.map((collection) => (
                          <DropdownMenuItem
                            key={collection.id}
                            onClick={() => onNavigateToCollection(collection.id)}
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

      {childCollectionsLoading && (
        <p className="mb-6 text-sm text-muted-foreground">{labels.loading}</p>
      )}

      {hasChildCollections && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 2xl:grid-cols-4">
          {filteredChildCollections.map((collection) => (
            <LibraryCollectionCard
              key={collection.id}
              collection={collection}
              onOpen={onOpenCollection}
              canManage={canManage}
              onEditBooks={onEditBooksInCollection}
              onEdit={onEditCollection}
              onDelete={onDeleteCollection}
              manageLabel={labels.manage}
              editBooksLabel={labels.editBooks}
              editLabel={labels.edit}
              deleteLabel={labels.delete}
            />
          ))}
        </div>
      )}

      {(hasChildCollections || childCollectionsLoading) && (hasBooks || isBooksLoadingFirstPage) && (
        <Separator className="my-8" />
      )}

      {(activeCollectionId || isBooksLoadingFirstPage || hasBooks) && (
        <LibraryBookGrid
          books={books}
          isLoadingFirstPage={isBooksLoadingFirstPage}
          isLoadingMore={isBooksLoadingMore}
          canLoadMore={canLoadMoreBooks}
          onLoadMore={onLoadMoreBooks}
          emptyMessage={labels.gridEmpty}
          loadingMessage={labels.gridLoading}
          loadMoreLabel={labels.gridLoadMore}
          loadingMoreLabel={labels.gridLoadingMore}
          unknownAuthorLabel={labels.unknownAuthor}
          openBookLabel={labels.openBook}
          getStatusLabel={getStatusLabel}
          getLanguageLabel={getLanguageLabel}
        />
      )}

      {showEmptyState && (
        <div className="rounded-xl border border-dashed p-10 text-center">
          <p className="text-sm text-muted-foreground">
            {isSearching
              ? labels.emptySearch
              : activeCollectionId
                ? labels.emptyCurrent
                : labels.emptyRoot}
          </p>
        </div>
      )}
    </>
  );
}
