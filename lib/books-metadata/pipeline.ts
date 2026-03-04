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

function defaultOptions(
  options?: MetadataExtractionPipelineOptions,
): Required<MetadataExtractionPipelineOptions> {
  return {
    includeCatalog: options?.includeCatalog ?? true,
    includeOpenLibrary: options?.includeOpenLibrary ?? true,
    includeGoogleBooks: options?.includeGoogleBooks ?? true,
    timeoutMs: options?.timeoutMs ?? 9000,
    includeOpenAI: options?.includeOpenAI ?? true,
    openAIModel: options?.openAIModel ?? "gpt-4.1-mini",
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
    return preliminaryResult;
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
