"use client";

import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { toast } from "sonner";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import type {
  LibraryBookDetailRecord,
  LibraryBookRecord,
} from "@/lib/library/types";
import { LibraryBookDetailInfo } from "@/components/library/library-book-detail-info";
import { ROUTES } from "@/lib/routes";
import { LibraryBookFormDialog } from "@/components/library/library-book-form-dialog";
import { LibraryBookDeleteDialog } from "@/components/library/library-book-delete-dialog";
import { Separator } from "@/components/ui/separator";
import { BookCard } from "@/components/library/book-card";

type LibraryBookDetailClientProps = {
  bookId: Id<"library_books">;
  initialBook?: LibraryBookDetailRecord | null;
};

export function LibraryBookDetailClient({
  bookId,
  initialBook,
}: LibraryBookDetailClientProps) {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("library.detail");
  const tGrid = useTranslations("library.grid");
  const tFilters = useTranslations("library.filters");
  const { user } = useUser();

  const liveBook = useQuery(api.library.getLibraryBookById, { id: bookId });
  const relatedBooksQuery = useQuery(api.library.getRelatedLibraryBooks, {
    bookId,
    limit: 6,
  });
  const toggleFavorite = useMutation(api.library.toggleLibraryBookFavorite);
  const book = liveBook ?? initialBook ?? null;
  const relatedBooks = relatedBooksQuery ?? [];
  const isRelatedBooksLoading = relatedBooksQuery === undefined;
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  const [isFavoriteLoading, setIsFavoriteLoading] = React.useState(false);

  const userRole = user?.publicMetadata?.role as string | undefined;
  const canManage = userRole === "admin" || userRole === "superadmin";

  const handleEdit = React.useCallback(() => {
    setIsEditDialogOpen(true);
  }, []);

  const handleDelete = React.useCallback(() => {
    setIsDeleteDialogOpen(true);
  }, []);

  const handleDeleteSuccess = React.useCallback(() => {
    router.push(ROUTES.library.allBooks.withLocale(locale));
  }, [locale, router]);

  const handleFavoriteToggle = React.useCallback(async () => {
    if (!book) {
      return;
    }

    setIsFavoriteLoading(true);
    try {
      await toggleFavorite({ bookId: book.id as Id<"library_books"> });
    } catch (error) {
      const message =
        error instanceof Error && error.message.trim().length > 0
          ? error.message
          : tGrid("favoriteError");
      toast.error(message);
    } finally {
      setIsFavoriteLoading(false);
    }
  }, [book, tGrid, toggleFavorite]);

  const getStatusLabel = React.useCallback(
    (status: LibraryBookRecord["status"]) => tFilters(`statusValues.${status}`),
    [tFilters],
  );

  const getLanguageLabel = React.useCallback(
    (language?: string) => {
      const normalized = (language ?? "").trim().toLowerCase();

      if (!normalized) {
        return undefined;
      }

      if (normalized === "es") {
        return tFilters("languageValues.es");
      }

      if (normalized === "en") {
        return tFilters("languageValues.en");
      }

      return normalized.toUpperCase();
    },
    [tFilters],
  );

  if (!book) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-muted-foreground">{t("loading")}</p>
      </div>
    );
  }

  return (
    <>
      {canManage && (
        <>
          <LibraryBookFormDialog
            bookId={bookId}
            book={book}
            open={isEditDialogOpen}
            onOpenChange={setIsEditDialogOpen}
          />
          <LibraryBookDeleteDialog
            bookId={bookId}
            bookTitle={book.title}
            fileName={book.fileName}
            open={isDeleteDialogOpen}
            onOpenChange={setIsDeleteDialogOpen}
            onSuccess={handleDeleteSuccess}
          />
        </>
      )}

      <LibraryBookDetailInfo
        book={book}
        locale={locale}
        isFavorite={Boolean(book.isFavorite)}
        isFavoriteLoading={isFavoriteLoading}
        onFavoriteToggle={handleFavoriteToggle}
        favoriteOnLabel={tGrid("favoriteOn")}
        favoriteOffLabel={tGrid("favoriteOff")}
        showExtractionWarnings={canManage}
        onEdit={canManage ? handleEdit : undefined}
        onDelete={canManage ? handleDelete : undefined}
      />

      <Separator />

      <section className="space-y-4 py-4">
        <div className="space-y-1">
          <h2 className="text-base font-semibold sm:text-lg">
            {t("related.title")}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t("related.description")}
          </p>
        </div>

        {isRelatedBooksLoading ? (
          <p className="text-sm text-muted-foreground">
            {t("related.loading")}
          </p>
        ) : relatedBooks.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
            {relatedBooks.map((relatedBook) => (
              <BookCard
                key={relatedBook.id}
                book={relatedBook}
                statusLabel={getStatusLabel(relatedBook.status)}
                languageLabel={getLanguageLabel(relatedBook.language)}
                unknownAuthorLabel={tGrid("unknownAuthor")}
                openBookLabel={tGrid("viewDetails")}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
            {t("related.empty")}
          </div>
        )}
      </section>
    </>
  );
}
