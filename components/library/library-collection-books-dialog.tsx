"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { useMutation, usePaginatedQuery } from "convex/react";
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

const INITIAL_PAGE_SIZE = 24;
const LOAD_MORE_PAGE_SIZE = 24;

type LibraryCollectionBooksDialogProps = {
  collectionId: string;
  collectionName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type PendingSelectionMap = Record<string, boolean>;

function matchesCurrentSelection(
  option: LibraryCollectionBookOption,
  pendingSelections: PendingSelectionMap,
) {
  return pendingSelections[option.id] ?? option.isAssigned;
}

export function LibraryCollectionBooksDialog({
  collectionId,
  collectionName,
  open,
  onOpenChange,
}: LibraryCollectionBooksDialogProps) {
  const t = useTranslations("library.collections.booksDialog");
  const tLibrary = useTranslations("library");
  const updateLibraryCollectionBooks = useMutation(
    api.library.updateLibraryCollectionBooks,
  );

  const [searchValue, setSearchValue] = React.useState("");
  const [pendingSelections, setPendingSelections] =
    React.useState<PendingSelectionMap>({});
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const deferredSearchValue = React.useDeferredValue(searchValue.trim());

  React.useEffect(() => {
    if (!open) {
      setSearchValue("");
      setPendingSelections({});
      setIsSubmitting(false);
      return;
    }

    setSearchValue("");
    setPendingSelections({});
    setIsSubmitting(false);
  }, [collectionId, open]);

  const {
    results: bookOptions,
    status,
    loadMore,
  } = usePaginatedQuery(
    api.library.getLibraryCollectionBookOptions,
    open
      ? {
          collectionId: collectionId as Id<"library_collections">,
          search: deferredSearchValue || undefined,
        }
      : "skip",
    { initialNumItems: INITIAL_PAGE_SIZE },
  );

  const pendingChangeCount = React.useMemo(
    () => Object.keys(pendingSelections).length,
    [pendingSelections],
  );

  const toggleBookSelection = React.useCallback(
    (option: LibraryCollectionBookOption, checked: boolean) => {
      setPendingSelections((current) => {
        const next = { ...current };

        if (checked === option.isAssigned) {
          delete next[option.id];
          return next;
        }

        next[option.id] = checked;
        return next;
      });
    },
    [],
  );

  const handleSubmit = React.useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      const addBookIds = Object.entries(pendingSelections)
        .filter(([, checked]) => checked)
        .map(([bookId]) => bookId as Id<"library_books">);
      const removeBookIds = Object.entries(pendingSelections)
        .filter(([, checked]) => !checked)
        .map(([bookId]) => bookId as Id<"library_books">);

      if (addBookIds.length === 0 && removeBookIds.length === 0) {
        onOpenChange(false);
        return;
      }

      try {
        setIsSubmitting(true);

        await updateLibraryCollectionBooks({
          collectionId: collectionId as Id<"library_collections">,
          addBookIds,
          removeBookIds,
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
    [collectionId, collectionName, onOpenChange, pendingSelections, t, updateLibraryCollectionBooks],
  );

  const isLoadingFirstPage = status === "LoadingFirstPage";
  const canLoadMore = status === "CanLoadMore";
  const hasBookOptions = bookOptions.length > 0;
  const emptyMessage =
    deferredSearchValue.length > 0 ? t("empty") : t("emptyLibrary");

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
                    disabled={isSubmitting}
                  />
                  <FieldDescription>
                    {t("pendingChanges", { count: pendingChangeCount })}
                  </FieldDescription>
                </Field>
              </FieldGroup>

              <div className="overflow-hidden rounded-md border">
                {isLoadingFirstPage ? (
                  <div className="flex min-h-56 items-center justify-center px-4 py-10 text-sm text-muted-foreground">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t("loading")}
                  </div>
                ) : !hasBookOptions ? (
                  <div className="px-4 py-10 text-center text-sm text-muted-foreground">
                    {emptyMessage}
                  </div>
                ) : (
                  <div className="divide-y">
                    {bookOptions.map((option) => {
                      const authorsLabel =
                        option.authors.length > 0
                          ? option.authors.join(", ")
                          : tLibrary("grid.unknownAuthor");
                      const isChecked = matchesCurrentSelection(
                        option,
                        pendingSelections,
                      );

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
                              toggleBookSelection(option, checked === true)
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

              {canLoadMore && (
                <div className="flex justify-center">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => loadMore(LOAD_MORE_PAGE_SIZE)}
                    disabled={isSubmitting}
                  >
                    {t("loadMore")}
                  </Button>
                </div>
              )}
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
            <Button type="submit" disabled={isSubmitting}>
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
