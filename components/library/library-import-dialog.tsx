"use client";

import * as React from "react";
import { useMutation, useQuery } from "convex/react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Loader2, Save, Upload } from "lucide-react";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  buildCreateLibraryBookPayload,
  createFallbackExtractionFromFile,
  createFormStateFromExtraction,
  EMPTY_LIBRARY_IMPORT_FORM_STATE,
  type LibraryExtractionResponse,
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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { LibraryCollectionSelector } from "@/components/library/library-collection-selector";
import { Spinner } from "@/components/ui/spinner";

type UploadResponse = {
  storageId?: string;
};

type ExtractionApiError = {
  error?: string;
};

type LookupIsbnApiResponse = {
  source: string;
  matchedBy: "isbn" | "query";
  confidence: number;
  metadata: {
    title: string;
    subtitle: string;
    authors: string[];
    publishers: string[];
    publishedYear: number | null;
    edition: string;
    isbn10: string;
    isbn13: string;
    abstract: string;
    language: string;
    categories: string[];
  };
};

type LookupIsbnApiError = {
  error?: string;
};

type ExtractionPhaseKey =
  | "analyzing"
  | "catalogLookup"
  | "aiRefinement"
  | "finalizing";

type ItemExtractionState =
  | "not_requested"
  | "pending"
  | "extracting"
  | "completed"
  | "failed";

type ItemSaveState = "idle" | "saving" | "saved" | "failed";

type LibraryImportItem = {
  id: string;
  file: File;
  fingerprint: string;
  storageId: Id<"_storage"> | null;
  formState: LibraryImportFormState;
  extractionState: ItemExtractionState;
  extractionProgress: number;
  extractError: string | null;
  saveState: ItemSaveState;
  saveError: string | null;
};

type IsbnLookupState = {
  status: "idle" | "loading" | "error";
  error: string | null;
};

const EXTRACTION_PHASES: ReadonlyArray<{
  maxProgress: number;
  key: ExtractionPhaseKey;
}> = [
  { maxProgress: 24, key: "analyzing" },
  { maxProgress: 58, key: "catalogLookup" },
  { maxProgress: 86, key: "aiRefinement" },
  { maxProgress: 100, key: "finalizing" },
];

function isPdf(file: File): boolean {
  if (file.type === "application/pdf") {
    return true;
  }

  return file.name.toLowerCase().endsWith(".pdf");
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function statusBadgeVariant(status: LibraryImportFormState["status"]) {
  if (status === "failed") {
    return "destructive" as const;
  }

  if (status === "needs_review") {
    return "secondary" as const;
  }

  return "default" as const;
}

function processBadgeVariant(
  extractionState: ItemExtractionState,
  saveState: ItemSaveState,
) {
  if (saveState === "saved") {
    return "default" as const;
  }

  if (saveState === "failed" || extractionState === "failed") {
    return "destructive" as const;
  }

  return "secondary" as const;
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return fallback;
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

function normalizeUploadUrl(value: string): string {
  const trimmed = value.trim();

  try {
    return new URL(trimmed, window.location.origin).toString();
  } catch {
    throw new Error("Invalid upload URL returned by Convex");
  }
}

function parseExtractionError(json: unknown): string | null {
  if (!json || typeof json !== "object") {
    return null;
  }

  const maybeError = (json as ExtractionApiError).error;
  if (typeof maybeError !== "string" || maybeError.trim().length === 0) {
    return null;
  }

  return maybeError;
}

function getExtractionPhase(progress: number): ExtractionPhaseKey {
  const normalizedProgress = Math.max(0, Math.min(100, progress));

  for (const phase of EXTRACTION_PHASES) {
    if (normalizedProgress <= phase.maxProgress) {
      return phase.key;
    }
  }

  return "finalizing";
}

function buildFileFingerprint(file: File): string {
  return `${file.name}:${file.size}:${file.lastModified}`;
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeIsbnCandidate(value: string): string {
  return value.toUpperCase().replace(/[^0-9X]/g, "");
}

function isValidIsbn10(isbn10: string): boolean {
  if (!/^\d{9}[\dX]$/.test(isbn10)) {
    return false;
  }

  let sum = 0;
  for (let i = 0; i < 10; i += 1) {
    const character = isbn10[i];
    const digit = character === "X" ? 10 : Number(character);
    sum += digit * (10 - i);
  }

  return sum % 11 === 0;
}

function isValidIsbn13(isbn13: string): boolean {
  if (!/^\d{13}$/.test(isbn13)) {
    return false;
  }

  let sum = 0;
  for (let i = 0; i < 12; i += 1) {
    const digit = Number(isbn13[i]);
    sum += i % 2 === 0 ? digit : digit * 3;
  }

  const checkDigit = (10 - (sum % 10)) % 10;
  return checkDigit === Number(isbn13[12]);
}

function normalizeIsbnForLookup(raw: string): string | null {
  const normalized = normalizeIsbnCandidate(raw);

  if (normalized.length === 10 && isValidIsbn10(normalized)) {
    return normalized;
  }

  if (normalized.length === 13 && isValidIsbn13(normalized)) {
    return normalized;
  }

  return null;
}

function normalizeCsv(values: string[]): string {
  const seen = new Set<string>();
  const output: string[] = [];

  for (const raw of values) {
    const value = normalizeWhitespace(raw);
    if (!value) {
      continue;
    }

    const key = value.toLowerCase();
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    output.push(value);
  }

  return output.join(", ");
}

function isBlank(value: string): boolean {
  return normalizeWhitespace(value).length === 0;
}

function mergeLookupMetadataIntoFormState(
  formState: LibraryImportFormState,
  metadata: LookupIsbnApiResponse["metadata"],
): LibraryImportFormState {
  const next = { ...formState };

  if (isBlank(next.title) && !isBlank(metadata.title)) {
    next.title = metadata.title;
  }
  if (isBlank(next.subtitle) && !isBlank(metadata.subtitle)) {
    next.subtitle = metadata.subtitle;
  }
  if (isBlank(next.authors) && metadata.authors.length > 0) {
    next.authors = normalizeCsv(metadata.authors);
  }
  if (isBlank(next.publishers) && metadata.publishers.length > 0) {
    next.publishers = normalizeCsv(metadata.publishers);
  }
  if (isBlank(next.publishedYear) && metadata.publishedYear) {
    next.publishedYear = String(metadata.publishedYear);
  }
  if (isBlank(next.edition) && !isBlank(metadata.edition)) {
    next.edition = metadata.edition;
  }
  if (isBlank(next.isbn10) && !isBlank(metadata.isbn10)) {
    next.isbn10 = metadata.isbn10;
  }
  if (isBlank(next.isbn13) && !isBlank(metadata.isbn13)) {
    next.isbn13 = metadata.isbn13;
  }
  if (isBlank(next.abstract) && !isBlank(metadata.abstract)) {
    next.abstract = metadata.abstract;
  }
  if (isBlank(next.language) && !isBlank(metadata.language)) {
    next.language = metadata.language.toLowerCase();
  }
  if (isBlank(next.categories) && metadata.categories.length > 0) {
    next.categories = normalizeCsv(metadata.categories);
  }

  return next;
}

function createItemId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function createImportItem(
  file: File,
  aiAssistanceEnabled: boolean,
): LibraryImportItem {
  return {
    id: createItemId(),
    file,
    fingerprint: buildFileFingerprint(file),
    storageId: null,
    formState: aiAssistanceEnabled
      ? createFormStateFromExtraction({
          extraction: createFallbackExtractionFromFile(file.name),
          fileName: file.name,
        })
      : EMPTY_LIBRARY_IMPORT_FORM_STATE,
    extractionState: aiAssistanceEnabled ? "pending" : "not_requested",
    extractionProgress: 0,
    extractError: null,
    saveState: "idle",
    saveError: null,
  };
}

function getProcessStateLabel(args: {
  extractionState: ItemExtractionState;
  saveState: ItemSaveState;
  t: ReturnType<typeof useTranslations>;
}): string {
  if (args.saveState === "saved") {
    return args.t("states.saved");
  }

  if (args.saveState === "saving") {
    return args.t("states.saving");
  }

  if (args.saveState === "failed") {
    return args.t("states.saveFailed");
  }

  return args.t(`states.extraction.${args.extractionState}`);
}

export function LibraryImportDialog() {
  const t = useTranslations("library.actions");
  const tLibrary = useTranslations("library");

  const generateUploadUrl = useMutation(
    api.library.generateLibraryBookUploadUrl,
  );
  const createLibraryBook = useMutation(api.library.createLibraryBook);
  const deleteUnusedLibraryUpload = useMutation(
    api.library.deleteUnusedLibraryUpload,
  );

  const [open, setOpen] = React.useState(false);
  const [aiAssistanceEnabled, setAiAssistanceEnabled] = React.useState(false);
  const [items, setItems] = React.useState<LibraryImportItem[]>([]);
  const [expandedItems, setExpandedItems] = React.useState<string[]>([]);
  const [saving, setSaving] = React.useState(false);
  const [isbnLookupByItem, setIsbnLookupByItem] = React.useState<
    Record<string, IsbnLookupState>
  >({});
  const collectionTree = useQuery(
    api.library.getLibraryCollectionsTree,
    open ? {} : "skip",
  );

  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const itemsRef = React.useRef<LibraryImportItem[]>([]);
  const isbnLookupTimeoutsRef = React.useRef<Record<string, number>>({});
  const isbnLookupVersionRef = React.useRef<Record<string, number>>({});

  const isExtracting = React.useMemo(
    () => items.some((item) => item.extractionState === "extracting"),
    [items],
  );
  const hasPendingExtractions = React.useMemo(
    () => items.some((item) => item.extractionState === "pending"),
    [items],
  );

  React.useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  const resetState = React.useCallback(() => {
    setAiAssistanceEnabled(false);
    setItems([]);
    setExpandedItems([]);
    setSaving(false);
    setIsbnLookupByItem({});

    for (const timeoutId of Object.values(isbnLookupTimeoutsRef.current)) {
      window.clearTimeout(timeoutId);
    }
    isbnLookupTimeoutsRef.current = {};
    isbnLookupVersionRef.current = {};

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  React.useEffect(() => {
    return () => {
      for (const timeoutId of Object.values(isbnLookupTimeoutsRef.current)) {
        window.clearTimeout(timeoutId);
      }
    };
  }, []);

  const cleanupUnusedUploads = React.useCallback(
    async (pendingItems: LibraryImportItem[]) => {
      const uploadIds = pendingItems
        .filter((item) => item.saveState !== "saved" && item.storageId)
        .map((item) => item.storageId as Id<"_storage">);

      if (uploadIds.length === 0) {
        return;
      }

      for (const storageId of uploadIds) {
        try {
          await deleteUnusedLibraryUpload({ storageId });
        } catch {
          // Best-effort cleanup for temporary uploads.
        }
      }
    },
    [deleteUnusedLibraryUpload],
  );

  const handleDialogChange = React.useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen && (saving || isExtracting)) {
        toast.info(t("closeBlockedWhileProcessing"));
        return;
      }

      setOpen(nextOpen);
      if (!nextOpen) {
        void cleanupUnusedUploads(items);
        resetState();
      }
    },
    [cleanupUnusedUploads, isExtracting, items, resetState, saving, t],
  );

  const updateItem = React.useCallback(
    (
      itemId: string,
      updater: (item: LibraryImportItem) => LibraryImportItem,
    ) => {
      setItems((current) =>
        current.map((item) => (item.id === itemId ? updater(item) : item)),
      );
    },
    [],
  );

  const setIsbnLookupState = React.useCallback(
    (itemId: string, nextState: IsbnLookupState) => {
      setIsbnLookupByItem((current) => ({
        ...current,
        [itemId]: nextState,
      }));
    },
    [],
  );

  const ensureStorageId = React.useCallback(
    async (item: LibraryImportItem): Promise<Id<"_storage">> => {
      if (item.storageId) {
        return item.storageId;
      }

      const uploadUrl = normalizeUploadUrl(await generateUploadUrl({}));
      const uploadResponse = await fetch(uploadUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/pdf",
        },
        body: item.file,
      });

      const uploadPayloadRaw = await readResponsePayload(uploadResponse);

      if (!uploadResponse.ok) {
        const uploadText = uploadPayloadRaw.text
          ? `HTTP ${uploadResponse.status}: ${compactTextSnippet(uploadPayloadRaw.text)}`
          : `HTTP ${uploadResponse.status}`;
        throw new Error(`${t("uploadError")} (${uploadText})`);
      }

      const uploadPayload = parseUploadResponse(uploadPayloadRaw.json);
      if (!uploadPayload.storageId) {
        throw new Error(
          `${t("uploadError")} (missing storageId in upload response)`,
        );
      }

      const storageId = uploadPayload.storageId as Id<"_storage">;
      updateItem(item.id, (current) => ({
        ...current,
        storageId,
      }));

      return storageId;
    },
    [generateUploadUrl, t, updateItem],
  );

  const runExtraction = React.useCallback(
    async (item: LibraryImportItem) => {
      updateItem(item.id, (current) => ({
        ...current,
        extractionState: "extracting",
        extractionProgress: 3,
        extractError: null,
      }));

      const interval = window.setInterval(() => {
        updateItem(item.id, (current) => {
          if (current.extractionState !== "extracting") {
            return current;
          }

          if (current.extractionProgress >= 92) {
            return current;
          }

          const remaining = 92 - current.extractionProgress;
          const increment = Math.max(1, Math.ceil(remaining * 0.12));

          return {
            ...current,
            extractionProgress: Math.min(
              92,
              current.extractionProgress + increment,
            ),
          };
        });
      }, 350);

      try {
        const storageId = await ensureStorageId(item);

        const body = new FormData();
        body.append("storageId", storageId);
        body.append("fileName", item.file.name);

        const response = await fetch("/api/library/extract-metadata", {
          method: "POST",
          body,
        });

        const payload = await readResponsePayload(response);

        if (!response.ok) {
          const parsedMessage = parseExtractionError(payload.json);
          const fallbackMessage = payload.text
            ? `HTTP ${response.status}: ${compactTextSnippet(payload.text)}`
            : `HTTP ${response.status}`;

          throw new Error(parsedMessage ?? fallbackMessage);
        }

        if (!payload.json || typeof payload.json !== "object") {
          throw new Error(
            `Invalid extraction response format (HTTP ${response.status})`,
          );
        }

        const extraction = payload.json as LibraryExtractionResponse;
        updateItem(item.id, (current) => ({
          ...current,
          formState: createFormStateFromExtraction({
            extraction,
            fileName: item.file.name,
          }),
          extractionState: "completed",
          extractionProgress: 100,
          extractError: null,
        }));
      } catch (error) {
        const message = getErrorMessage(error, t("extractError"));

        updateItem(item.id, (current) => ({
          ...current,
          formState: createFormStateFromExtraction({
            extraction: createFallbackExtractionFromFile(item.file.name),
            fileName: item.file.name,
          }),
          extractionState: "failed",
          extractionProgress: 100,
          extractError: message,
        }));
      } finally {
        window.clearInterval(interval);
      }
    },
    [ensureStorageId, t, updateItem],
  );

  React.useEffect(() => {
    if (!aiAssistanceEnabled || isExtracting) {
      return;
    }

    const nextItem = items.find(
      (item) =>
        item.extractionState === "pending" && item.saveState !== "saved",
    );
    if (!nextItem) {
      return;
    }

    void runExtraction(nextItem);
  }, [aiAssistanceEnabled, isExtracting, items, runExtraction]);

  React.useEffect(() => {
    setItems((current) => {
      let changed = false;

      const next = current.map((item) => {
        if (
          aiAssistanceEnabled &&
          item.extractionState === "not_requested" &&
          item.saveState !== "saved"
        ) {
          changed = true;
          return {
            ...item,
            extractionState: "pending" as const,
          };
        }

        if (!aiAssistanceEnabled && item.extractionState === "pending") {
          changed = true;
          return {
            ...item,
            extractionState: "not_requested" as const,
          };
        }

        return item;
      });

      return changed ? next : current;
    });
  }, [aiAssistanceEnabled]);

  const handleFileChange = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFiles = Array.from(event.target.files ?? []);
      if (selectedFiles.length === 0) {
        return;
      }

      const knownFingerprints = new Set(items.map((item) => item.fingerprint));

      const newItems: LibraryImportItem[] = [];
      let invalidCount = 0;
      let duplicateCount = 0;

      for (const file of selectedFiles) {
        if (!isPdf(file)) {
          invalidCount += 1;
          continue;
        }

        const fingerprint = buildFileFingerprint(file);
        if (knownFingerprints.has(fingerprint)) {
          duplicateCount += 1;
          continue;
        }

        knownFingerprints.add(fingerprint);
        newItems.push(createImportItem(file, aiAssistanceEnabled));
      }

      if (invalidCount > 0) {
        toast.error(t("invalidType"));
      }

      if (duplicateCount > 0) {
        toast.info(t("duplicateSkipped", { count: duplicateCount }));
      }

      if (newItems.length > 0) {
        setItems((current) => [...current, ...newItems]);
      }

      event.target.value = "";
    },
    [aiAssistanceEnabled, items, t],
  );

  const updateField = React.useCallback(
    <K extends keyof LibraryImportFormState>(
      itemId: string,
      field: K,
      value: LibraryImportFormState[K],
    ) => {
      updateItem(itemId, (item) => ({
        ...item,
        formState: {
          ...item.formState,
          [field]: value,
        },
      }));
    },
    [updateItem],
  );

  const lookupMetadataByIsbn = React.useCallback(
    async (itemId: string, isbn: string) => {
      const currentVersion = (isbnLookupVersionRef.current[itemId] ?? 0) + 1;
      isbnLookupVersionRef.current[itemId] = currentVersion;
      setIsbnLookupState(itemId, { status: "loading", error: null });

      try {
        const latestItem = itemsRef.current.find((item) => item.id === itemId);
        const response = await fetch("/api/library/lookup-isbn", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            isbn,
            isbn10: latestItem?.formState.isbn10,
            isbn13: latestItem?.formState.isbn13,
            title: latestItem?.formState.title,
            author: latestItem?.formState.authors,
          }),
        });

        const payload = await readResponsePayload(response);
        if (isbnLookupVersionRef.current[itemId] !== currentVersion) {
          return;
        }

        if (!response.ok) {
          const apiMessage = parseExtractionError(
            payload.json as LookupIsbnApiError,
          );
          const fallbackMessage = payload.text
            ? `HTTP ${response.status}: ${compactTextSnippet(payload.text)}`
            : `HTTP ${response.status}`;

          throw new Error(apiMessage ?? fallbackMessage);
        }

        if (!payload.json || typeof payload.json !== "object") {
          throw new Error(t("isbnLookup.invalidResponse"));
        }

        const lookup = payload.json as LookupIsbnApiResponse;
        updateItem(itemId, (item) => ({
          ...item,
          formState: mergeLookupMetadataIntoFormState(
            item.formState,
            lookup.metadata,
          ),
        }));

        setIsbnLookupState(itemId, { status: "idle", error: null });
      } catch (error) {
        if (isbnLookupVersionRef.current[itemId] !== currentVersion) {
          return;
        }

        const message = getErrorMessage(error, t("isbnLookup.error"));
        setIsbnLookupState(itemId, {
          status: "error",
          error: message,
        });
      }
    },
    [setIsbnLookupState, t, updateItem],
  );

  const scheduleIsbnLookup = React.useCallback(
    (itemId: string, isbn10Raw: string, isbn13Raw: string) => {
      const isbn13 = normalizeIsbnForLookup(isbn13Raw);
      const isbn10 = normalizeIsbnForLookup(isbn10Raw);
      const isbn = isbn13 ?? isbn10;

      const existingTimeout = isbnLookupTimeoutsRef.current[itemId];
      if (existingTimeout) {
        window.clearTimeout(existingTimeout);
        delete isbnLookupTimeoutsRef.current[itemId];
      }

      if (!isbn) {
        isbnLookupVersionRef.current[itemId] =
          (isbnLookupVersionRef.current[itemId] ?? 0) + 1;
        setIsbnLookupState(itemId, { status: "idle", error: null });
        return;
      }

      const timeoutId = window.setTimeout(() => {
        void lookupMetadataByIsbn(itemId, isbn);
      }, 550);
      isbnLookupTimeoutsRef.current[itemId] = timeoutId;
    },
    [lookupMetadataByIsbn, setIsbnLookupState],
  );

  const updateIsbnField = React.useCallback(
    (item: LibraryImportItem, field: "isbn10" | "isbn13", value: string) => {
      updateField(item.id, field, value);

      const nextIsbn10 = field === "isbn10" ? value : item.formState.isbn10;
      const nextIsbn13 = field === "isbn13" ? value : item.formState.isbn13;
      scheduleIsbnLookup(item.id, nextIsbn10, nextIsbn13);
    },
    [scheduleIsbnLookup, updateField],
  );

  const getLanguageOptions = React.useCallback(
    (language: string) => {
      const baseOptions: Array<{ value: string; label: string }> = [
        {
          value: "es",
          label: tLibrary("filters.languageValues.es"),
        },
        {
          value: "en",
          label: tLibrary("filters.languageValues.en"),
        },
      ];

      const normalizedLanguage = language.trim().toLowerCase();
      if (
        normalizedLanguage &&
        !baseOptions.some((option) => option.value === normalizedLanguage)
      ) {
        baseOptions.push({
          value: normalizedLanguage,
          label: normalizedLanguage.toUpperCase(),
        });
      }

      return baseOptions;
    },
    [tLibrary],
  );

  const handleSubmit = React.useCallback(async () => {
    if (items.length === 0) {
      toast.error(t("selectPdfFirst"));
      return;
    }

    setSaving(true);

    const candidates = items.filter((item) => item.saveState !== "saved");
    let successCount = 0;
    let failureCount = 0;

    for (const candidate of candidates) {
      let storageId = candidate.storageId;

      updateItem(candidate.id, (item) => ({
        ...item,
        saveState: "saving",
        saveError: null,
      }));

      try {
        if (!storageId) {
          storageId = await ensureStorageId(candidate);
        }

        const payload = buildCreateLibraryBookPayload({
          formState: candidate.formState,
          fileName: candidate.file.name,
          fileSizeBytes: candidate.file.size,
          storageId,
        });

        await createLibraryBook({
          ...payload,
          storageId: payload.storageId as Id<"_storage">,
          collectionIds: payload.collectionIds.map(
            (collectionId) => collectionId as Id<"library_collections">,
          ),
        });

        successCount += 1;
        updateItem(candidate.id, (item) => ({
          ...item,
          saveState: "saved",
          saveError: null,
        }));
      } catch (error) {
        failureCount += 1;

        const message = getErrorMessage(error, t("saveError"));
        updateItem(candidate.id, (item) => ({
          ...item,
          saveState: "failed",
          saveError: message,
        }));
      }
    }

    setSaving(false);

    if (failureCount === 0) {
      toast.success(t("saved"));
      setOpen(false);
      resetState();
      return;
    }

    toast.error(
      t("saveBulkError", {
        successCount,
        failureCount,
      }),
    );
  }, [createLibraryBook, ensureStorageId, items, resetState, t, updateItem]);

  const canSave =
    !saving &&
    !isExtracting &&
    !hasPendingExtractions &&
    items.some((item) => item.saveState !== "saved");

  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="cursor-pointer bg-white dark:bg-dark-gunmetal"
        >
          {t("importMetadata")}
          <Upload className="h-4 w-4" />
        </Button>
      </DialogTrigger>

      <DialogContent className="!flex h-[90dvh] max-h-[90dvh] w-full !flex-col gap-0 overflow-hidden p-0 sm:max-w-[700px]">
        <DialogHeader className="border-b px-6 pt-6 pb-4 pr-12">
          <DialogTitle>{t("dialogTitle")}</DialogTitle>
          <DialogDescription>{t("dialogDescription")}</DialogDescription>
        </DialogHeader>

        <form
          className="flex min-h-0 flex-1 flex-col"
          onSubmit={(event) => {
            event.preventDefault();
            void handleSubmit();
          }}
        >
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-4">
            <div className="space-y-5">
              <FieldGroup>
                {/*<Field>
                  <FieldLabel htmlFor="library-ai-assistance">
                    {t("aiAssistance.label")}
                  </FieldLabel>
                  <FieldContent className="items-start gap-2">
                    <Switch
                      id="library-ai-assistance"
                      checked={aiAssistanceEnabled}
                      onCheckedChange={setAiAssistanceEnabled}
                      disabled={isExtracting || saving}
                    />
                    <FieldDescription className="text-xs text-muted-foreground">
                      {aiAssistanceEnabled
                        ? t("aiAssistance.enabledHint")
                        : t("aiAssistance.disabledHint")}
                    </FieldDescription>
                  </FieldContent>
                </Field>*/}

                <Field>
                  <FieldLabel htmlFor="library-pdf-file">
                    {t("pdfLabel")}
                  </FieldLabel>
                  <Input
                    id="library-pdf-file"
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,application/pdf"
                    multiple
                    onChange={handleFileChange}
                    disabled={isExtracting || saving}
                  />
                  <FieldDescription>
                    {aiAssistanceEnabled
                      ? t("pdfHintAiEnabled")
                      : t("pdfHintAiDisabled")}
                  </FieldDescription>
                </Field>

                <div className="rounded-md border px-3 py-2 text-sm text-muted-foreground">
                  {items.length > 0
                    ? t("selectedFiles", { count: items.length })
                    : t("noFilesSelected")}
                </div>
              </FieldGroup>

              {items.length > 0 && (
                <Accordion
                  type="multiple"
                  value={expandedItems}
                  onValueChange={setExpandedItems}
                  className="w-full min-w-0 overflow-hidden rounded-md border px-3"
                >
                  {items.map((item, index) => {
                    const extractionPhase = getExtractionPhase(
                      item.extractionProgress,
                    );
                    const languageOptions = getLanguageOptions(
                      item.formState.language,
                    );
                    const selectedLanguageValue =
                      item.formState.language.trim().toLowerCase() || undefined;
                    const processLabel = getProcessStateLabel({
                      extractionState: item.extractionState,
                      saveState: item.saveState,
                      t,
                    });

                    return (
                      <AccordionItem value={item.id} key={item.id}>
                        <AccordionTrigger className="w-full min-w-0 overflow-hidden hover:no-underline">
                          <div className="flex min-w-0 flex-1 flex-col items-start gap-2 sm:flex-row sm:items-center sm:gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="max-w-full whitespace-normal text-sm leading-snug font-semibold [overflow-wrap:anywhere]">
                                {item.file.name}
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {t("bookNumber", { index: index + 1 })} •{" "}
                                {formatFileSize(item.file.size)}
                              </p>
                            </div>
                            <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
                              <Badge
                                variant={processBadgeVariant(
                                  item.extractionState,
                                  item.saveState,
                                )}
                              >
                                {processLabel}
                              </Badge>
                              <Badge
                                variant={statusBadgeVariant(
                                  item.formState.status,
                                )}
                              >
                                {tLibrary(
                                  `filters.statusValues.${item.formState.status}`,
                                )}
                              </Badge>
                            </div>
                          </div>
                        </AccordionTrigger>

                        <AccordionContent>
                          {item.extractionState === "extracting" && (
                            <div
                              className="relative mb-4 overflow-hidden rounded-md border bg-muted/30 px-3 py-2"
                              aria-live="polite"
                            >
                              <div
                                className="absolute inset-y-0 left-0 bg-primary/10 transition-[width] duration-500 ease-out"
                                style={{ width: `${item.extractionProgress}%` }}
                              />
                              <div className="relative flex items-center gap-2 text-sm">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <span>{t("extracting")}</span>
                              </div>
                              <p className="relative mt-1 text-xs font-medium text-foreground/80">
                                {t(`extractingPhases.${extractionPhase}`)}
                              </p>
                              <p className="relative mt-1 text-xs text-muted-foreground">
                                {t("extractingProgress", {
                                  progress: Math.max(
                                    1,
                                    Math.min(
                                      99,
                                      Math.floor(item.extractionProgress),
                                    ),
                                  ),
                                })}
                              </p>
                            </div>
                          )}

                          {item.extractError && (
                            <Alert variant="destructive" className="mb-4">
                              <AlertDescription>
                                {item.extractError}
                              </AlertDescription>
                            </Alert>
                          )}

                          {item.saveError && (
                            <Alert variant="destructive" className="mb-4">
                              <AlertDescription>
                                {item.saveError}
                              </AlertDescription>
                            </Alert>
                          )}

                          <div className="mb-4 flex flex-wrap items-center gap-2 rounded-md border px-3 py-2 text-xs text-muted-foreground">
                            <Badge
                              variant={statusBadgeVariant(
                                item.formState.status,
                              )}
                            >
                              {tLibrary(
                                `filters.statusValues.${item.formState.status}`,
                              )}
                            </Badge>
                            <span>
                              {t("confidence")}:{" "}
                              {(item.formState.confidence * 100).toFixed(0)}%
                            </span>
                          </div>

                          <FieldGroup className="grid gap-4 md:grid-cols-2">
                            <Field className="md:col-span-2">
                              <FieldLabel htmlFor={`library-title-${item.id}`}>
                                {t("fields.title")}
                              </FieldLabel>
                              <Input
                                id={`library-title-${item.id}`}
                                value={item.formState.title}
                                onChange={(event) =>
                                  updateField(
                                    item.id,
                                    "title",
                                    event.target.value,
                                  )
                                }
                                disabled={saving || item.saveState === "saved"}
                              />
                            </Field>

                            <Field>
                              <FieldLabel
                                htmlFor={`library-subtitle-${item.id}`}
                              >
                                {t("fields.subtitle")}
                              </FieldLabel>
                              <Input
                                id={`library-subtitle-${item.id}`}
                                value={item.formState.subtitle}
                                onChange={(event) =>
                                  updateField(
                                    item.id,
                                    "subtitle",
                                    event.target.value,
                                  )
                                }
                                disabled={saving || item.saveState === "saved"}
                              />
                            </Field>

                            <Field>
                              <FieldLabel
                                htmlFor={`library-language-${item.id}`}
                              >
                                {t("fields.language")}
                              </FieldLabel>
                              <Select
                                value={selectedLanguageValue}
                                onValueChange={(value) =>
                                  updateField(item.id, "language", value)
                                }
                                disabled={saving || item.saveState === "saved"}
                              >
                                <SelectTrigger
                                  id={`library-language-${item.id}`}
                                  className="w-full"
                                >
                                  <SelectValue
                                    placeholder={t(
                                      "fields.languagePlaceholder",
                                    )}
                                  />
                                </SelectTrigger>
                                <SelectContent>
                                  {languageOptions.map((option) => (
                                    <SelectItem
                                      key={option.value}
                                      value={option.value}
                                    >
                                      {option.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </Field>

                            <Field>
                              <FieldLabel
                                htmlFor={`library-authors-${item.id}`}
                              >
                                {t("fields.authors")}
                              </FieldLabel>
                              <Input
                                id={`library-authors-${item.id}`}
                                value={item.formState.authors}
                                onChange={(event) =>
                                  updateField(
                                    item.id,
                                    "authors",
                                    event.target.value,
                                  )
                                }
                                disabled={saving || item.saveState === "saved"}
                                placeholder={t("commaSeparated")}
                              />
                            </Field>

                            <Field>
                              <FieldLabel
                                htmlFor={`library-publishers-${item.id}`}
                              >
                                {t("fields.publishers")}
                              </FieldLabel>
                              <Input
                                id={`library-publishers-${item.id}`}
                                value={item.formState.publishers}
                                onChange={(event) =>
                                  updateField(
                                    item.id,
                                    "publishers",
                                    event.target.value,
                                  )
                                }
                                disabled={saving || item.saveState === "saved"}
                                placeholder={t("commaSeparated")}
                              />
                            </Field>

                            <Field>
                              <FieldLabel htmlFor={`library-year-${item.id}`}>
                                {t("fields.publishedYear")}
                              </FieldLabel>
                              <Input
                                id={`library-year-${item.id}`}
                                value={item.formState.publishedYear}
                                onChange={(event) =>
                                  updateField(
                                    item.id,
                                    "publishedYear",
                                    event.target.value,
                                  )
                                }
                                disabled={saving || item.saveState === "saved"}
                                inputMode="numeric"
                                placeholder="2022"
                              />
                            </Field>

                            <Field>
                              <FieldLabel
                                htmlFor={`library-edition-${item.id}`}
                              >
                                {t("fields.edition")}
                              </FieldLabel>
                              <Input
                                id={`library-edition-${item.id}`}
                                value={item.formState.edition}
                                onChange={(event) =>
                                  updateField(
                                    item.id,
                                    "edition",
                                    event.target.value,
                                  )
                                }
                                disabled={saving || item.saveState === "saved"}
                              />
                            </Field>

                            <Field>
                              <FieldLabel htmlFor={`library-isbn13-${item.id}`}>
                                {t("fields.isbn13")}
                              </FieldLabel>
                              <Input
                                id={`library-isbn13-${item.id}`}
                                value={item.formState.isbn13}
                                onChange={(event) =>
                                  updateIsbnField(
                                    item,
                                    "isbn13",
                                    event.target.value,
                                  )
                                }
                                disabled={saving || item.saveState === "saved"}
                              />
                            </Field>

                            <Field>
                              <FieldLabel htmlFor={`library-isbn10-${item.id}`}>
                                {t("fields.isbn10")}
                              </FieldLabel>
                              <Input
                                id={`library-isbn10-${item.id}`}
                                value={item.formState.isbn10}
                                onChange={(event) =>
                                  updateIsbnField(
                                    item,
                                    "isbn10",
                                    event.target.value,
                                  )
                                }
                                disabled={saving || item.saveState === "saved"}
                              />
                            </Field>

                            <Field className="md:col-span-2">
                              <FieldDescription>
                                {isbnLookupByItem[item.id]?.status ===
                                "loading" ? (
                                  <span className="inline-flex items-center gap-2">
                                    <Spinner className="h-3.5 w-3.5" />
                                    {t("isbnLookup.loading")}
                                  </span>
                                ) : isbnLookupByItem[item.id]?.status ===
                                  "error" ? (
                                  (isbnLookupByItem[item.id]?.error ??
                                  t("isbnLookup.error"))
                                ) : (
                                  t("isbnLookup.hint")
                                )}
                              </FieldDescription>
                            </Field>

                            <Field className="md:col-span-2">
                              <FieldLabel
                                htmlFor={`library-categories-${item.id}`}
                              >
                                {t("fields.categories")}
                              </FieldLabel>
                              <Input
                                id={`library-categories-${item.id}`}
                                value={item.formState.categories}
                                onChange={(event) =>
                                  updateField(
                                    item.id,
                                    "categories",
                                    event.target.value,
                                  )
                                }
                                disabled={saving || item.saveState === "saved"}
                                placeholder={t("commaSeparated")}
                              />
                            </Field>

                            <Field className="md:col-span-2">
                              <FieldLabel>{t("fields.collections")}</FieldLabel>
                              <LibraryCollectionSelector
                                collections={collectionTree ?? []}
                                selectedIds={item.formState.collectionIds}
                                onChange={(value) =>
                                  updateField(item.id, "collectionIds", value)
                                }
                                placeholder={t("collections.placeholder")}
                                searchPlaceholder={t(
                                  "collections.searchPlaceholder",
                                )}
                                emptyLabel={t("collections.empty")}
                                selectedLabel={t("collections.selectedCount")}
                                clearLabel={t("collections.clear")}
                                disabled={saving || item.saveState === "saved"}
                              />
                            </Field>

                            <Field>
                              <FieldLabel htmlFor={`library-status-${item.id}`}>
                                {t("fields.status")}
                              </FieldLabel>
                              <Select value={item.formState.status} disabled>
                                <SelectTrigger
                                  id={`library-status-${item.id}`}
                                  className="w-full"
                                >
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="ok">
                                    {tLibrary("filters.statusValues.ok")}
                                  </SelectItem>
                                  <SelectItem value="needs_review">
                                    {tLibrary(
                                      "filters.statusValues.needs_review",
                                    )}
                                  </SelectItem>
                                  <SelectItem value="failed">
                                    {tLibrary("filters.statusValues.failed")}
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </Field>

                            <Field>
                              <FieldLabel
                                htmlFor={`library-confidence-${item.id}`}
                              >
                                {t("fields.confidence")}
                              </FieldLabel>
                              <Input
                                id={`library-confidence-${item.id}`}
                                type="number"
                                min={0}
                                max={1}
                                step={0.01}
                                value={item.formState.confidence}
                                disabled
                              />
                            </Field>

                            <Field className="md:col-span-2">
                              <FieldLabel
                                htmlFor={`library-abstract-${item.id}`}
                              >
                                {t("fields.abstract")}
                              </FieldLabel>
                              <Textarea
                                id={`library-abstract-${item.id}`}
                                value={item.formState.abstract}
                                onChange={(event) =>
                                  updateField(
                                    item.id,
                                    "abstract",
                                    event.target.value,
                                  )
                                }
                                disabled={saving || item.saveState === "saved"}
                                rows={5}
                              />
                            </Field>
                          </FieldGroup>

                          {item.formState.warnings.length > 0 && (
                            <Alert className="mt-4">
                              <AlertDescription>
                                <p className="font-medium">
                                  {t("warningsTitle")}
                                </p>
                                <ul className="mt-1 list-disc pl-4">
                                  {item.formState.warnings.map(
                                    (warning, warningIndex) => (
                                      <li key={`${warning}-${warningIndex}`}>
                                        {warning}
                                      </li>
                                    ),
                                  )}
                                </ul>
                              </AlertDescription>
                            </Alert>
                          )}
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })}
                </Accordion>
              )}
            </div>
          </div>

          <DialogFooter className="border-t bg-background px-6 py-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleDialogChange(false)}
              disabled={saving}
            >
              {t("cancel")}
            </Button>
            <Button type="submit" disabled={!canSave}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t("saving")}
                </>
              ) : (
                <>
                  {items.length > 1 ? t("saveBulk") : t("save")}
                  <Save className="h-4 w-4" />
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
