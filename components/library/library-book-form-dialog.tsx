"use client";

import * as React from "react";
import { useMutation, useQuery } from "convex/react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import type { LibraryBookDetailRecord } from "@/lib/library/types";
import {
  buildUpdateLibraryBookPayload,
  createFormStateFromLibraryBook,
  type LibraryImportFormState,
} from "@/lib/library/import";
import { Button } from "@/components/ui/button";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LibraryCollectionSelector } from "@/components/library/library-collection-selector";

type UploadResponse = {
  storageId?: string;
};

function isPdfFile(file: File): boolean {
  if (file.type === "application/pdf") {
    return true;
  }

  return file.name.toLowerCase().endsWith(".pdf");
}

function compactTextSnippet(text: string): string {
  return text.replace(/\s+/g, " ").trim().slice(0, 180);
}

async function readResponsePayload(response: Response): Promise<{
  json: unknown;
  text: string;
}> {
  const text = await response.text();

  if (!text) {
    return { json: null, text: "" };
  }

  try {
    return { json: JSON.parse(text), text };
  } catch {
    return { json: null, text };
  }
}

function parseUploadResponse(json: unknown): UploadResponse {
  if (!json || typeof json !== "object") {
    return {};
  }

  const maybeStorageId = (json as UploadResponse).storageId;
  if (typeof maybeStorageId !== "string") {
    return {};
  }

  return { storageId: maybeStorageId };
}

function normalizeUploadUrl(value: string): string {
  const trimmed = value.trim();

  try {
    return new URL(trimmed, window.location.origin).toString();
  } catch {
    throw new Error("Invalid upload URL returned by Convex");
  }
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return fallback;
}

type LibraryBookFormDialogProps = {
  bookId: Id<"library_books">;
  book: LibraryBookDetailRecord;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function LibraryBookFormDialog({
  bookId,
  book,
  open,
  onOpenChange,
}: LibraryBookFormDialogProps) {
  const tDetail = useTranslations("library.detail");
  const tDialog = useTranslations("library.detail.editDialog");
  const tFilters = useTranslations("library.filters");
  const generateUploadUrl = useMutation(
    api.library.generateLibraryBookUploadUrl,
  );
  const deleteUnusedLibraryUpload = useMutation(
    api.library.deleteUnusedLibraryUpload,
  );
  const updateLibraryBook = useMutation(api.library.updateLibraryBook);
  const collectionTree = useQuery(
    api.library.getLibraryCollectionsTree,
    open ? {} : "skip",
  );

  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [replacementPdfFile, setReplacementPdfFile] =
    React.useState<File | null>(null);
  const [formState, setFormState] = React.useState<LibraryImportFormState>(() =>
    createFormStateFromLibraryBook(book),
  );
  const replacementPdfInputRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    if (!open) {
      return;
    }

    setFormState(createFormStateFromLibraryBook(book));
    setFormError(null);
    setIsSubmitting(false);
    setReplacementPdfFile(null);

    if (replacementPdfInputRef.current) {
      replacementPdfInputRef.current.value = "";
    }
  }, [book, open]);

  const updateField = React.useCallback(
    <K extends keyof LibraryImportFormState>(
      field: K,
      value: LibraryImportFormState[K],
    ) => {
      setFormState((current) => ({
        ...current,
        [field]: value,
      }));
    },
    [],
  );

  const languageOptions = React.useMemo(() => {
    const baseOptions: Array<{ value: string; label: string }> = [
      { value: "es", label: tFilters("languageValues.es") },
      { value: "en", label: tFilters("languageValues.en") },
    ];

    const normalized = formState.language.trim().toLowerCase();
    if (
      normalized &&
      !baseOptions.some((option) => option.value === normalized)
    ) {
      baseOptions.push({
        value: normalized,
        label: normalized.toUpperCase(),
      });
    }

    return baseOptions;
  }, [formState.language, tFilters]);

  const selectedLanguageValue =
    formState.language.trim().toLowerCase() || "__none";

  const handleReplacementPdfChange = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const nextFile = event.target.files?.[0] ?? null;

      if (!nextFile) {
        setReplacementPdfFile(null);
        return;
      }

      if (!isPdfFile(nextFile)) {
        setReplacementPdfFile(null);
        setFormError(tDialog("pdfInvalidType"));
        event.target.value = "";
        toast.error(tDialog("pdfInvalidType"));
        return;
      }

      setFormError(null);
      setReplacementPdfFile(nextFile);
    },
    [tDialog],
  );

  const clearReplacementPdfSelection = React.useCallback(() => {
    setReplacementPdfFile(null);

    if (replacementPdfInputRef.current) {
      replacementPdfInputRef.current.value = "";
    }
  }, []);

  const uploadReplacementPdf = React.useCallback(
    async (file: File): Promise<Id<"_storage">> => {
      const uploadUrl = normalizeUploadUrl(await generateUploadUrl({}));
      const uploadResponse = await fetch(uploadUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/pdf",
        },
        body: file,
      });

      const uploadPayloadRaw = await readResponsePayload(uploadResponse);

      if (!uploadResponse.ok) {
        const uploadText = uploadPayloadRaw.text
          ? `HTTP ${uploadResponse.status}: ${compactTextSnippet(uploadPayloadRaw.text)}`
          : `HTTP ${uploadResponse.status}`;
        throw new Error(`${tDialog("uploadError")} (${uploadText})`);
      }

      const uploadPayload = parseUploadResponse(uploadPayloadRaw.json);
      if (!uploadPayload.storageId) {
        throw new Error(
          `${tDialog("uploadError")} (missing storageId in upload response)`,
        );
      }

      return uploadPayload.storageId as Id<"_storage">;
    },
    [generateUploadUrl, tDialog],
  );

  const handleSubmit = React.useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setFormError(null);

      let uploadedReplacementStorageId: Id<"_storage"> | null = null;

      try {
        setIsSubmitting(true);

        const replacementFilePayload = replacementPdfFile
          ? {
              storageId: await uploadReplacementPdf(replacementPdfFile),
              fileName: replacementPdfFile.name,
              fileSizeBytes: replacementPdfFile.size,
            }
          : undefined;

        uploadedReplacementStorageId =
          replacementFilePayload?.storageId ?? null;

        const payload = buildUpdateLibraryBookPayload({
          bookId,
          formState,
          replacementFile: replacementFilePayload,
        });

        await updateLibraryBook({
          ...payload,
          bookId: payload.bookId as Id<"library_books">,
          collectionIds: payload.collectionIds.map(
            (collectionId) => collectionId as Id<"library_collections">,
          ),
          replacementFile: payload.replacementFile
            ? {
                ...payload.replacementFile,
                storageId: payload.replacementFile.storageId as Id<"_storage">,
              }
            : undefined,
        });

        toast.success(tDialog("success"));
        onOpenChange(false);
      } catch (error) {
        if (uploadedReplacementStorageId) {
          try {
            await deleteUnusedLibraryUpload({
              storageId: uploadedReplacementStorageId,
            });
          } catch {
            // Best-effort cleanup for uploaded replacement files not linked to a book.
          }
        }

        const message = getErrorMessage(error, tDialog("error"));
        setFormError(message);
        toast.error(message);
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      bookId,
      deleteUnusedLibraryUpload,
      formState,
      onOpenChange,
      replacementPdfFile,
      tDialog,
      updateLibraryBook,
      uploadReplacementPdf,
    ],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{tDialog("title")}</DialogTitle>
          <DialogDescription>{tDialog("description")}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <Alert variant="destructive">
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          )}

          <FieldGroup className="grid gap-4 md:grid-cols-2">
            <Field className="md:col-span-2">
              <FieldLabel htmlFor="library-edit-title">
                {tDetail("fields.title")}
              </FieldLabel>
              <Input
                id="library-edit-title"
                value={formState.title}
                onChange={(event) => updateField("title", event.target.value)}
                disabled={isSubmitting}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="library-edit-subtitle">
                {tDetail("fields.subtitle")}
              </FieldLabel>
              <Input
                id="library-edit-subtitle"
                value={formState.subtitle}
                onChange={(event) =>
                  updateField("subtitle", event.target.value)
                }
                disabled={isSubmitting}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="library-edit-language">
                {tDetail("fields.language")}
              </FieldLabel>
              <Select
                value={selectedLanguageValue}
                onValueChange={(value) =>
                  updateField("language", value === "__none" ? "" : value)
                }
                disabled={isSubmitting}
              >
                <SelectTrigger id="library-edit-language" className="w-full">
                  <SelectValue
                    placeholder={tDetail("fields.languagePlaceholder")}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">—</SelectItem>
                  {languageOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field>
              <FieldLabel htmlFor="library-edit-status">
                {tDetail("fields.status")}
              </FieldLabel>
              <Select
                value={formState.status}
                onValueChange={(value) =>
                  updateField(
                    "status",
                    value as LibraryImportFormState["status"],
                  )
                }
                disabled={isSubmitting}
              >
                <SelectTrigger id="library-edit-status" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ok">
                    {tFilters("statusValues.ok")}
                  </SelectItem>
                  <SelectItem value="needs_review">
                    {tFilters("statusValues.needs_review")}
                  </SelectItem>
                  <SelectItem value="failed">
                    {tFilters("statusValues.failed")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </Field>

            <Field>
              <FieldLabel htmlFor="library-edit-authors">
                {tDetail("fields.authors")}
              </FieldLabel>
              <Input
                id="library-edit-authors"
                value={formState.authors}
                onChange={(event) => updateField("authors", event.target.value)}
                disabled={isSubmitting}
                placeholder={tDialog("commaSeparated")}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="library-edit-publishers">
                {tDetail("fields.publishers")}
              </FieldLabel>
              <Input
                id="library-edit-publishers"
                value={formState.publishers}
                onChange={(event) =>
                  updateField("publishers", event.target.value)
                }
                disabled={isSubmitting}
                placeholder={tDialog("commaSeparated")}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="library-edit-published-year">
                {tDetail("fields.publishedYear")}
              </FieldLabel>
              <Input
                id="library-edit-published-year"
                value={formState.publishedYear}
                onChange={(event) =>
                  updateField("publishedYear", event.target.value)
                }
                disabled={isSubmitting}
                inputMode="numeric"
                placeholder="2022"
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="library-edit-edition">
                {tDetail("fields.edition")}
              </FieldLabel>
              <Input
                id="library-edit-edition"
                value={formState.edition}
                onChange={(event) => updateField("edition", event.target.value)}
                disabled={isSubmitting}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="library-edit-isbn13">
                {tDetail("fields.isbn13")}
              </FieldLabel>
              <Input
                id="library-edit-isbn13"
                value={formState.isbn13}
                onChange={(event) => updateField("isbn13", event.target.value)}
                disabled={isSubmitting}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="library-edit-isbn10">
                {tDetail("fields.isbn10")}
              </FieldLabel>
              <Input
                id="library-edit-isbn10"
                value={formState.isbn10}
                onChange={(event) => updateField("isbn10", event.target.value)}
                disabled={isSubmitting}
              />
            </Field>

            <Field className="md:col-span-2">
              <FieldLabel htmlFor="library-edit-categories">
                {tDetail("fields.categories")}
              </FieldLabel>
              <Input
                id="library-edit-categories"
                value={formState.categories}
                onChange={(event) =>
                  updateField("categories", event.target.value)
                }
                disabled={isSubmitting}
                placeholder={tDialog("commaSeparated")}
              />
            </Field>

            <Field className="md:col-span-2">
              <FieldLabel>{tDetail("fields.collections")}</FieldLabel>
              <LibraryCollectionSelector
                collections={collectionTree ?? []}
                selectedIds={formState.collectionIds}
                onChange={(value) => updateField("collectionIds", value)}
                placeholder={tDialog("collections.placeholder")}
                searchPlaceholder={tDialog("collections.searchPlaceholder")}
                emptyLabel={tDialog("collections.empty")}
                selectedLabel={tDialog("collections.selectedCount")}
                clearLabel={tDialog("collections.clear")}
                disabled={isSubmitting}
              />
            </Field>

            <Field className="md:col-span-2">
              <FieldLabel htmlFor="library-edit-pdf">
                {tDialog("pdfLabel")}
              </FieldLabel>
              <Input
                id="library-edit-pdf"
                ref={replacementPdfInputRef}
                type="file"
                accept=".pdf,application/pdf"
                onChange={handleReplacementPdfChange}
                disabled={isSubmitting}
              />
              <FieldDescription>
                {replacementPdfFile
                  ? tDialog("pdfSelected", {
                      fileName: replacementPdfFile.name,
                    })
                  : tDialog("pdfCurrent", { fileName: book.fileName })}
              </FieldDescription>
              {replacementPdfFile && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="mt-2 px-0"
                  onClick={clearReplacementPdfSelection}
                  disabled={isSubmitting}
                >
                  {tDialog("clearSelectedPdf")}
                </Button>
              )}
            </Field>

            <Field className="md:col-span-2">
              <FieldLabel htmlFor="library-edit-abstract">
                {tDetail("fields.abstract")}
              </FieldLabel>
              <Textarea
                id="library-edit-abstract"
                value={formState.abstract}
                onChange={(event) =>
                  updateField("abstract", event.target.value)
                }
                disabled={isSubmitting}
                rows={5}
              />
            </Field>
          </FieldGroup>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              {tDialog("cancel")}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {tDialog("saving")}
                </>
              ) : (
                tDialog("save")
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
