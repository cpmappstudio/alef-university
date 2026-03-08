"use client";

import * as React from "react";

import { BookCard } from "@/components/library/book-card";
import { Button } from "@/components/ui/button";
import type { LibraryBookRecord } from "@/lib/library/types";

type LibraryBookGridProps = {
  books: LibraryBookRecord[];
  emptyMessage: string;
  loadingMessage: string;
  loadMoreLabel: string;
  loadingMoreLabel: string;
  unknownAuthorLabel: string;
  openBookLabel: string;
  isLoadingFirstPage?: boolean;
  isLoadingMore?: boolean;
  canLoadMore?: boolean;
  onLoadMore?: () => void;
  getStatusLabel: (status: LibraryBookRecord["status"]) => string;
  getLanguageLabel: (language?: string) => string | undefined;
};

export function LibraryBookGrid({
  books,
  emptyMessage,
  loadingMessage,
  loadMoreLabel,
  loadingMoreLabel,
  unknownAuthorLabel,
  openBookLabel,
  isLoadingFirstPage = false,
  isLoadingMore = false,
  canLoadMore = false,
  onLoadMore,
  getStatusLabel,
  getLanguageLabel,
}: LibraryBookGridProps) {
  if (books.length === 0) {
    return (
      <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
        {isLoadingFirstPage ? loadingMessage : emptyMessage}
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
        {books.map((book) => (
          <BookCard
            key={book.id}
            book={book}
            statusLabel={getStatusLabel(book.status)}
            languageLabel={getLanguageLabel(book.language)}
            unknownAuthorLabel={unknownAuthorLabel}
            openBookLabel={openBookLabel}
          />
        ))}
      </div>

      {(canLoadMore || isLoadingMore) && onLoadMore && (
        <div className="mt-6 flex justify-center">
          <Button
            variant="outline"
            onClick={onLoadMore}
            disabled={isLoadingMore}
            className="cursor-pointer"
          >
            {isLoadingMore ? loadingMoreLabel : loadMoreLabel}
          </Button>
        </div>
      )}
    </>
  );
}
