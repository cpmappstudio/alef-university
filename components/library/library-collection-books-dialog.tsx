"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import type { LibraryCollectionBookOption } from "@/lib/library/types";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";

type LibraryCollectionBooksDialogProps = {
  collectionId: string;
  collectionName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function matchesBookSearch(
  option: LibraryCollectionBookOption,
  searchValue: string,
) {
  const normalizedSearch = searchValue.trim().toLowerCase();

  if (!normalizedSearch) {
    return true;
  }

  return [option.title, option.authors.join(" ")]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .includes(normalizedSearch);
}

export function LibraryCollectionBooksDialog({
  collectionId,
  collectionName,
  open,
  onOpenChange,
}: LibraryCollectionBooksDialogProps) {
  const t = useTranslations("library.collections.booksDialog");
  const tLibrary = useTranslations("library");
  const syncLibraryCollectionBooks = useMutation(
    api.library.syncLibraryCollectionBooks,
  );
  const bookOptions = useQuery(
    api.library.getLibraryCollectionBookOptions,
    open
      ? {
          collectionId: collectionId as Id<"library_collections">,
        }
      : "skip",
  );

  const [searchValue, setSearchValue] = React.useState("");
  const [selectedBookIds, setSelectedBookIds] = React.useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isSelectionHydrated, setIsSelectionHydrated] = React.useState(false);

  React.useEffect(() => {
    if (!open) {
      setSearchValue("");
      setSelectedBookIds([]);
      setIsSubmitting(false);
      setIsSelectionHydrated(false);
      return;
    }

    setSearchValue("");
    setSelectedBookIds([]);
    setIsSubmitting(false);
    setIsSelectionHydrated(false);
  }, [collectionId, open]);

  React.useEffect(() => {
    if (!open || bookOptions === undefined || isSelectionHydrated) {
      return;
    }

    setSelectedBookIds(
      bookOptions
        .filter((option) => option.isAssigned)
        .map((option) => option.id),
    );
    setIsSelectionHydrated(true);
  }, [bookOptions, isSelectionHydrated, open]);

  const filteredBookOptions = React.useMemo(
    () =>
      (bookOptions ?? []).filter((option) =>
        matchesBookSearch(option, searchValue),
      ),
    [bookOptions, searchValue],
  );

  const selectedBookIdSet = React.useMemo(
    () => new Set(selectedBookIds),
    [selectedBookIds],
  );

  const totalBookCount = React.useMemo(
    () => bookOptions?.length ?? 0,
    [bookOptions],
  );

  const toggleBookSelection = React.useCallback(
    (bookId: string, checked: boolean) => {
      setSelectedBookIds((current) => {
        const next = new Set(current);

        if (checked) {
          next.add(bookId);
        } else {
          next.delete(bookId);
        }

        return [...next];
      });
    },
    [],
  );

  const handleSubmit = React.useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      try {
        setIsSubmitting(true);

        await syncLibraryCollectionBooks({
          collectionId: collectionId as Id<"library_collections">,
          bookIds: selectedBookIds as Id<"library_books">[],
        });

        toast.success(t("success", { name: collectionName }));
        onOpenChange(false);
      } catch (error) {
        const message =
          error instanceof Error && error.message.trim().length > 0
            ? error.message
            : t("error");
        toast.error(message);
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      collectionId,
      collectionName,
      onOpenChange,
      selectedBookIds,
      syncLibraryCollectionBooks,
      t,
    ],
  );

  const hasBookOptions = (bookOptions?.length ?? 0) > 0;
  const hasFilteredBookOptions = filteredBookOptions.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!flex h-[90dvh] max-h-[90dvh] w-full !flex-col gap-0 overflow-hidden p-0 sm:max-w-[700px]">
        <DialogHeader className="border-b px-6 pt-6 pb-4 pr-12">
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>
            {t("description", { name: collectionName })}
          </DialogDescription>
        </DialogHeader>

        <form
          className="flex min-h-0 flex-1 flex-col"
          onSubmit={(event) => {
            void handleSubmit(event);
          }}
        >
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-4">
            <div className="space-y-5">
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="library-collection-books-search">
                    {t("searchLabel")}
                  </FieldLabel>
                  <Input
                    id="library-collection-books-search"
                    value={searchValue}
                    onChange={(event) => setSearchValue(event.target.value)}
                    placeholder={t("searchPlaceholder")}
                    disabled={isSubmitting || bookOptions === undefined}
                  />
                  <FieldDescription>
                    {t("selectedCount", { count: selectedBookIds.length })}{" "}
                    {bookOptions !== undefined
                      ? `• ${t("totalCount", { count: totalBookCount })}`
                      : ""}
                  </FieldDescription>
                </Field>
              </FieldGroup>

              <div className="overflow-hidden rounded-md border">
                {bookOptions === undefined ? (
                  <div className="flex min-h-56 items-center justify-center px-4 py-10 text-sm text-muted-foreground">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t("loading")}
                  </div>
                ) : !hasBookOptions ? (
                  <div className="px-4 py-10 text-center text-sm text-muted-foreground">
                    {t("emptyLibrary")}
                  </div>
                ) : !hasFilteredBookOptions ? (
                  <div className="px-4 py-10 text-center text-sm text-muted-foreground">
                    {t("empty")}
                  </div>
                ) : (
                  <div className="divide-y">
                    {filteredBookOptions.map((option) => {
                      const authorsLabel =
                        option.authors.length > 0
                          ? option.authors.join(", ")
                          : tLibrary("grid.unknownAuthor");
                      const isChecked = selectedBookIdSet.has(option.id);

                      return (
                        <label
                          key={option.id}
                          htmlFor={`collection-book-${option.id}`}
                          className="flex cursor-pointer items-start gap-3 px-4 py-3 transition-colors hover:bg-muted/40"
                        >
                          <Checkbox
                            id={`collection-book-${option.id}`}
                            checked={isChecked}
                            disabled={isSubmitting}
                            onCheckedChange={(checked) =>
                              toggleBookSelection(option.id, checked === true)
                            }
                            className="mt-0.5"
                          />

                          <div className="min-w-0 flex-1 space-y-1">
                            <p className="min-w-0 text-sm font-medium [overflow-wrap:anywhere]">
                              {option.title}
                            </p>
                            <p className="text-sm text-muted-foreground [overflow-wrap:anywhere]">
                              {authorsLabel}
                            </p>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="border-t px-6 py-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              {t("cancel")}
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || bookOptions === undefined}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("submitting")}
                </>
              ) : (
                t("submit")
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
