import type {
  BookMetadataResult,
  CandidateMetadata,
} from "@/lib/books-metadata/types";
import type { LibraryBookRecord } from "@/lib/library/types";

export type LibraryExtractionResponse = {
  status: BookMetadataResult["status"];
  confidence: number;
  missingFields: Array<keyof CandidateMetadata>;
  warnings: string[];
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

export type LibraryImportFormState = {
  title: string;
  subtitle: string;
  authors: string;
  publishers: string;
  publishedYear: string;
  edition: string;
  isbn10: string;
  isbn13: string;
  abstract: string;
  language: string;
  categories: string;
  status: BookMetadataResult["status"];
  confidence: number;
  warnings: string[];
};

export const EMPTY_LIBRARY_IMPORT_FORM_STATE: LibraryImportFormState = {
  title: "",
  subtitle: "",
  authors: "",
  publishers: "",
  publishedYear: "",
  edition: "",
  isbn10: "",
  isbn13: "",
  abstract: "",
  language: "",
  categories: "",
  status: "needs_review",
  confidence: 0,
  warnings: [],
};

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeOptionalText(value: string): string | undefined {
  const normalized = normalizeWhitespace(value);
  return normalized.length > 0 ? normalized : undefined;
}

function uniqueStrings(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const raw of values) {
    const normalized = normalizeWhitespace(raw);
    if (!normalized) {
      continue;
    }

    const key = normalized.toLowerCase();
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(normalized);
  }

  return result;
}

function normalizeListText(value: string): string[] {
  return uniqueStrings(value.split(/[\n,;]+/g));
}

function titleFromFileName(fileName?: string): string {
  if (!fileName) {
    return "";
  }

  return normalizeWhitespace(fileName.replace(/\.[^.]+$/, ""));
}

function clampConfidence(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(1, value));
}

function toCsv(value: string[] | undefined): string {
  if (!value || value.length === 0) {
    return "";
  }

  return uniqueStrings(value).join(", ");
}

function parsePublishedYear(value: string): number | undefined {
  const parsed = Number.parseInt(value.trim(), 10);

  if (!Number.isFinite(parsed)) {
    return undefined;
  }

  if (parsed < 1600 || parsed > 2100) {
    return undefined;
  }

  return parsed;
}

function normalizeLanguageCode(value: string): string | undefined {
  const normalized = normalizeWhitespace(value).toLowerCase();
  if (!normalized) {
    return undefined;
  }

  const folded = normalized.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  if (
    folded === "en" ||
    folded === "eng" ||
    folded === "english" ||
    folded === "ingles"
  ) {
    return "en";
  }

  if (
    folded === "es" ||
    folded === "spa" ||
    folded === "spanish" ||
    folded === "espanol" ||
    folded === "castellano"
  ) {
    return "es";
  }

  if (/^[a-z]{2}$/.test(folded)) {
    return folded;
  }

  return undefined;
}

export function createFormStateFromExtraction(args: {
  extraction: LibraryExtractionResponse;
  fileName?: string;
}): LibraryImportFormState {
  const { extraction, fileName } = args;

  return {
    title:
      normalizeWhitespace(extraction.metadata.title) ||
      titleFromFileName(fileName),
    subtitle: normalizeWhitespace(extraction.metadata.subtitle),
    authors: toCsv(extraction.metadata.authors),
    publishers: toCsv(extraction.metadata.publishers),
    publishedYear:
      extraction.metadata.publishedYear !== null
        ? String(extraction.metadata.publishedYear)
        : "",
    edition: normalizeWhitespace(extraction.metadata.edition),
    isbn10: normalizeWhitespace(extraction.metadata.isbn10),
    isbn13: normalizeWhitespace(extraction.metadata.isbn13),
    abstract: normalizeWhitespace(extraction.metadata.abstract),
    language: normalizeLanguageCode(extraction.metadata.language) ?? "",
    categories: toCsv(extraction.metadata.categories),
    status: extraction.status,
    confidence: clampConfidence(extraction.confidence),
    warnings: uniqueStrings(extraction.warnings ?? []),
  };
}

export function createFormStateFromLibraryBook(
  book: Pick<
    LibraryBookRecord,
    | "title"
    | "subtitle"
    | "authors"
    | "publishers"
    | "publishedYear"
    | "edition"
    | "isbn10"
    | "isbn13"
    | "abstract"
    | "language"
    | "categories"
    | "status"
    | "confidence"
    | "extractionWarnings"
  >,
): LibraryImportFormState {
  return {
    title: normalizeWhitespace(book.title),
    subtitle: normalizeWhitespace(book.subtitle ?? ""),
    authors: toCsv(book.authors),
    publishers: toCsv(book.publishers),
    publishedYear: book.publishedYear ? String(book.publishedYear) : "",
    edition: normalizeWhitespace(book.edition ?? ""),
    isbn10: normalizeWhitespace(book.isbn10 ?? ""),
    isbn13: normalizeWhitespace(book.isbn13 ?? ""),
    abstract: normalizeWhitespace(book.abstract ?? ""),
    language: normalizeLanguageCode(book.language ?? "") ?? "",
    categories: toCsv(book.categories),
    status: book.status,
    confidence: clampConfidence(book.confidence),
    warnings: uniqueStrings(book.extractionWarnings ?? []),
  };
}

function buildNormalizedMetadataFromFormState(
  formState: LibraryImportFormState,
) {
  return {
    title: normalizeOptionalText(formState.title),
    subtitle: normalizeOptionalText(formState.subtitle),
    authors: normalizeListText(formState.authors),
    publishers: normalizeListText(formState.publishers),
    publishedYear: parsePublishedYear(formState.publishedYear),
    edition: normalizeOptionalText(formState.edition),
    isbn10: normalizeOptionalText(formState.isbn10),
    isbn13: normalizeOptionalText(formState.isbn13),
    abstract: normalizeOptionalText(formState.abstract),
    language: normalizeLanguageCode(formState.language),
    categories: normalizeListText(formState.categories),
  };
}

export function buildCreateLibraryBookPayload(args: {
  formState: LibraryImportFormState;
  fileName: string;
  fileSizeBytes: number;
  storageId: string;
}) {
  const { formState, fileName, fileSizeBytes, storageId } = args;

  const title =
    normalizeOptionalText(formState.title) ?? titleFromFileName(fileName);
  if (!title) {
    throw new Error("A valid title is required");
  }

  const metadata = buildNormalizedMetadataFromFormState(formState);

  return {
    storageId,
    fileName: normalizeWhitespace(fileName),
    fileSizeBytes: Math.max(0, Math.trunc(fileSizeBytes)),
    status: formState.status,
    confidence: clampConfidence(formState.confidence),
    metadata: {
      title,
      subtitle: metadata.subtitle,
      authors: metadata.authors,
      publishers: metadata.publishers,
      publishedYear: metadata.publishedYear,
      edition: metadata.edition,
      isbn10: metadata.isbn10,
      isbn13: metadata.isbn13,
      abstract: metadata.abstract,
      language: metadata.language,
      categories: metadata.categories,
    },
    extractionWarnings: uniqueStrings(formState.warnings),
  };
}

export function buildUpdateLibraryBookPayload(args: {
  bookId: string;
  formState: LibraryImportFormState;
  replacementFile?: {
    storageId: string;
    fileName: string;
    fileSizeBytes: number;
  };
}) {
  const { bookId, formState, replacementFile } = args;
  const metadata = buildNormalizedMetadataFromFormState(formState);
  const title = metadata.title;

  if (!title) {
    throw new Error("A valid title is required");
  }

  return {
    bookId,
    status: formState.status,
    metadata: {
      title,
      subtitle: metadata.subtitle,
      authors: metadata.authors,
      publishers: metadata.publishers,
      publishedYear: metadata.publishedYear,
      edition: metadata.edition,
      isbn10: metadata.isbn10,
      isbn13: metadata.isbn13,
      abstract: metadata.abstract,
      language: metadata.language,
      categories: metadata.categories,
    },
    extractionWarnings: uniqueStrings(formState.warnings),
    replacementFile: replacementFile
      ? {
          storageId: replacementFile.storageId,
          fileName: normalizeWhitespace(replacementFile.fileName),
          fileSizeBytes: Math.max(0, Math.trunc(replacementFile.fileSizeBytes)),
        }
      : undefined,
  };
}

export function createFallbackExtractionFromFile(
  fileName: string,
): LibraryExtractionResponse {
  return {
    status: "needs_review",
    confidence: 0,
    missingFields: [
      "title",
      "authors",
      "publishedYear",
      "publishers",
      "categories",
    ],
    warnings: [],
    metadata: {
      title: titleFromFileName(fileName),
      subtitle: "",
      authors: [],
      publishers: [],
      publishedYear: null,
      edition: "",
      isbn10: "",
      isbn13: "",
      abstract: "",
      language: "",
      categories: [],
    },
  };
}
