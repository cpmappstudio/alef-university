import { extractLocalMetadata } from "./extractors";
import { lookupCatalogMetadata } from "./catalogs";
import { mergeMetadataCandidates } from "./merge";
import { extractMetadataWithOpenAI } from "./openai";
import type { BookMetadataResult, MetadataCandidate } from "./types";

export type MetadataExtractionPipelineOptions = {
  includeCatalog?: boolean;
  includeOpenLibrary?: boolean;
  includeGoogleBooks?: boolean;
  timeoutMs?: number;
  includeOpenAI?: boolean;
  openAIModel?: string;
  openAITimeoutMs?: number;
  googleBooksApiKey?: string;
};

const OPENAI_PRIMARY_SAMPLE_MAX_PAGES = 12;
const OPENAI_RETRY_SAMPLE_MAX_PAGES = 6;

function isValidIsbn10(isbn10: string): boolean {
  if (!/^\d{9}[\dX]$/.test(isbn10)) {
    return false;
  }

  let sum = 0;
  for (let index = 0; index < 10; index += 1) {
    const character = isbn10[index];
    const value = character === "X" ? 10 : Number(character);
    sum += value * (10 - index);
  }

  return sum % 11 === 0;
}

function isValidIsbn13(isbn13: string): boolean {
  if (!/^\d{13}$/.test(isbn13)) {
    return false;
  }

  let sum = 0;
  for (let index = 0; index < 12; index += 1) {
    const value = Number(isbn13[index]);
    sum += index % 2 === 0 ? value : value * 3;
  }

  const checkDigit = (10 - (sum % 10)) % 10;
  return checkDigit === Number(isbn13[12]);
}

function isbn13From10(isbn10: string): string {
  const core = `978${isbn10.slice(0, 9)}`;
  let sum = 0;
  for (let index = 0; index < 12; index += 1) {
    const value = Number(core[index]);
    sum += index % 2 === 0 ? value : value * 3;
  }

  const checkDigit = (10 - (sum % 10)) % 10;
  return `${core}${checkDigit}`;
}

function hasAmbiguousIsbnSet(isbns: string[]): boolean {
  const unique = [...new Set(isbns)];
  if (unique.length <= 1) {
    return false;
  }

  const pendingIsbn13 = new Set(
    unique.filter((isbn) => isbn.length === 13 && isValidIsbn13(isbn)),
  );
  let unmatchedCount = 0;

  for (const isbn of unique) {
    if (isbn.length === 10 && isValidIsbn10(isbn)) {
      const pairedIsbn13 = isbn13From10(isbn);
      if (pendingIsbn13.has(pairedIsbn13)) {
        pendingIsbn13.delete(pairedIsbn13);
        continue;
      }

      unmatchedCount += 1;
      continue;
    }

    if (isbn.length === 13 && isValidIsbn13(isbn)) {
      if (pendingIsbn13.has(isbn)) {
        pendingIsbn13.delete(isbn);
        unmatchedCount += 1;
      }
      continue;
    }

    unmatchedCount += 1;
  }

  return unmatchedCount > 1;
}

function buildLookupIsbns(
  local: ReturnType<typeof extractLocalMetadata>,
): string[] {
  const isbns = new Set<string>();

  for (const isbn of local.extractedIsbns) {
    isbns.add(isbn);
  }

  if (local.candidate.metadata.isbn10) {
    isbns.add(local.candidate.metadata.isbn10);
  }

  if (local.candidate.metadata.isbn13) {
    isbns.add(local.candidate.metadata.isbn13);
  }

  return [...isbns];
}

function hasContextWindowWarning(warnings: string[]): boolean {
  return warnings.some((warning) =>
    warning.toLowerCase().includes("context window"),
  );
}

function removeContextWindowWarnings(warnings: string[]): string[] {
  return warnings.filter(
    (warning) => !warning.toLowerCase().includes("context window"),
  );
}

function hasNonIsbnMetadata(candidate: MetadataCandidate): boolean {
  const metadata = candidate.metadata;

  return Boolean(
    metadata.title ||
      metadata.subtitle ||
      metadata.authors?.length ||
      metadata.publishers?.length ||
      metadata.publishedYear ||
      metadata.edition ||
      metadata.abstract ||
      metadata.language ||
      metadata.categories?.length,
  );
}

function hasUsableIsbnCatalogMatch(
  catalogCandidates: MetadataCandidate[],
): boolean {
  return catalogCandidates.some(
    (candidate) =>
      candidate.matchedBy === "isbn" &&
      (candidate.source === "openlibrary" ||
        candidate.source === "google_books") &&
      hasNonIsbnMetadata(candidate),
  );
}

function hasOnlyQueryCatalogCandidates(
  catalogCandidates: MetadataCandidate[],
): boolean {
  return (
    catalogCandidates.length > 0 &&
    catalogCandidates.every((candidate) => candidate.matchedBy === "query")
  );
}

function defaultOptions(
  options?: MetadataExtractionPipelineOptions,
): Required<MetadataExtractionPipelineOptions> {
  return {
    includeCatalog: options?.includeCatalog ?? true,
    includeOpenLibrary: options?.includeOpenLibrary ?? true,
    includeGoogleBooks: options?.includeGoogleBooks ?? true,
    timeoutMs: options?.timeoutMs ?? 9000,
    includeOpenAI: options?.includeOpenAI ?? true,
    openAIModel: options?.openAIModel ?? "gpt-5-mini",
    openAITimeoutMs: options?.openAITimeoutMs ?? 180000,
    googleBooksApiKey:
      options?.googleBooksApiKey ?? process.env.GOOGLE_BOOKS_API_KEY ?? "",
  };
}

export async function extractBookMetadataFromPdf(args: {
  fileName: string;
  fileBuffer: Buffer;
  filePath?: string;
  options?: MetadataExtractionPipelineOptions;
}): Promise<BookMetadataResult> {
  const resolvedOptions = defaultOptions(args.options);

  const local = extractLocalMetadata(args.fileName, args.fileBuffer);
  const extraWarnings: string[] = [];

  let catalogCandidates: MetadataCandidate[] = [];

  if (resolvedOptions.includeCatalog) {
    const isbns = buildLookupIsbns(local);
    const title = local.candidate.metadata.title;
    const author = local.candidate.metadata.authors?.[0];

    catalogCandidates = await lookupCatalogMetadata({
      title,
      author,
      isbns,
      includeOpenLibrary: resolvedOptions.includeOpenLibrary,
      includeGoogleBooks: resolvedOptions.includeGoogleBooks,
      timeoutMs: resolvedOptions.timeoutMs,
      googleBooksApiKey: resolvedOptions.googleBooksApiKey || undefined,
    });
  }

  const preliminaryResult = mergeMetadataCandidates({
    filePath: args.filePath ?? args.fileName,
    fileName: args.fileName,
    fileSizeBytes: args.fileBuffer.byteLength,
    local,
    catalogCandidates,
  });

  if (!resolvedOptions.includeOpenAI || preliminaryResult.status === "ok") {
    const queryOnlyCatalogSupport =
      hasOnlyQueryCatalogCandidates(catalogCandidates);

    if (!resolvedOptions.includeOpenAI || !queryOnlyCatalogSupport) {
      return preliminaryResult;
    }
  }

  const lookupIsbns = buildLookupIsbns(local);
  const hasAmbiguousLookupIsbns = hasAmbiguousIsbnSet(lookupIsbns);
  const queryOnlyCatalogSupport =
    hasOnlyQueryCatalogCandidates(catalogCandidates);

  if (
    hasUsableIsbnCatalogMatch(catalogCandidates) &&
    !hasAmbiguousLookupIsbns
  ) {
    return preliminaryResult;
  }

  if (hasUsableIsbnCatalogMatch(catalogCandidates) && hasAmbiguousLookupIsbns) {
    extraWarnings.push(
      "Multiple ISBN candidates were detected locally; continuing to OpenAI to avoid locking metadata to a possibly older edition.",
    );
  }

  if (queryOnlyCatalogSupport) {
    extraWarnings.push(
      "Only query-based catalog matches were found; continuing to OpenAI to validate the PDF's actual edition and metadata.",
    );
  }

  const openAIResult = await extractMetadataWithOpenAI({
    fileName: args.fileName,
    fileBuffer: args.fileBuffer,
    model: resolvedOptions.openAIModel,
    timeoutMs: resolvedOptions.openAITimeoutMs,
    sampleMaxPages: OPENAI_PRIMARY_SAMPLE_MAX_PAGES,
  });

  extraWarnings.push(...openAIResult.warnings);

  let openAICandidate = openAIResult.candidate;
  if (
    !openAICandidate &&
    hasContextWindowWarning(openAIResult.warnings) &&
    resolvedOptions.openAIModel !== "gpt-4.1"
  ) {
    const retry = await extractMetadataWithOpenAI({
      fileName: args.fileName,
      fileBuffer: args.fileBuffer,
      model: "gpt-4.1",
      timeoutMs: resolvedOptions.openAITimeoutMs,
      sampleMaxPages: OPENAI_RETRY_SAMPLE_MAX_PAGES,
    });

    openAICandidate = retry.candidate;

    if (retry.candidate) {
      const nonContext = removeContextWindowWarnings(extraWarnings);
      extraWarnings.length = 0;
      extraWarnings.push(
        ...nonContext,
        `OpenAI fallback retried with model gpt-4.1 and ${OPENAI_RETRY_SAMPLE_MAX_PAGES} sampled pages due to context window limits.`,
      );
    } else {
      extraWarnings.push(
        `OpenAI fallback retried with model gpt-4.1 and ${OPENAI_RETRY_SAMPLE_MAX_PAGES} sampled pages due to context window limits.`,
      );
    }

    extraWarnings.push(...retry.warnings);
  }

  const enrichedCandidates = openAICandidate
    ? [...catalogCandidates, openAICandidate]
    : catalogCandidates;

  return mergeMetadataCandidates({
    filePath: args.filePath ?? args.fileName,
    fileName: args.fileName,
    fileSizeBytes: args.fileBuffer.byteLength,
    local,
    catalogCandidates: enrichedCandidates,
    extraWarnings,
  });
}
