import type {
  BookMetadataResult,
  CandidateMetadata,
  LocalExtractionResult,
  MetadataCandidate,
  SourceEvidence,
} from "./types";

const REQUIRED_FIELDS: Array<keyof CandidateMetadata> = [
  "title",
  "authors",
  "publishedYear",
  "publishers",
  "categories",
];

const LOCAL_TITLE_WARNING =
  "No title found in filename or PDF info dictionary.";
const LOCAL_AUTHORS_WARNING =
  "No authors found in filename or PDF info dictionary.";
const LOCAL_ISBN_WARNING = "No valid ISBN found in PDF binary content.";

function sourceWeight(source: MetadataCandidate["source"]): number {
  if (source === "openlibrary") return 0.36;
  if (source === "google_books") return 0.32;
  if (source === "openai") return 0.34;
  if (source === "pdf_info") return 0.22;
  if (source === "pdf_binary") return 0.18;
  return 0.12;
}

function matchBonus(candidate: MetadataCandidate): number {
  if (candidate.matchedBy === "isbn") return 0.18;
  if (candidate.matchedBy === "query") return 0.08;
  return 0;
}

function scoreCandidate(candidate: MetadataCandidate): number {
  return (
    candidate.confidence +
    sourceWeight(candidate.source) +
    matchBonus(candidate)
  );
}

function hasValue(value: unknown): boolean {
  if (value === undefined || value === null) {
    return false;
  }
  if (typeof value === "string") {
    return value.trim().length > 0;
  }
  if (typeof value === "number") {
    return Number.isFinite(value);
  }
  if (Array.isArray(value)) {
    return value.length > 0;
  }
  return true;
}

function uniqueStrings(values: string[]): string[] {
  const seen = new Set<string>();
  const output: string[] = [];

  for (const raw of values) {
    const value = raw.replace(/\s+/g, " ").trim();
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

  return output;
}

function isContradictoryWarning(
  warning: string,
  metadata: CandidateMetadata,
): boolean {
  const normalizedWarning = warning.trim().toLowerCase();

  if (
    normalizedWarning === LOCAL_TITLE_WARNING.toLowerCase() &&
    Boolean(metadata.title)
  ) {
    return true;
  }

  if (
    normalizedWarning === LOCAL_AUTHORS_WARNING.toLowerCase() &&
    Boolean(metadata.authors?.length)
  ) {
    return true;
  }

  if (
    normalizedWarning === LOCAL_ISBN_WARNING.toLowerCase() &&
    Boolean(metadata.isbn10 || metadata.isbn13)
  ) {
    return true;
  }

  return false;
}

function resolveWarningsForFinalMetadata(
  warnings: string[],
  metadata: CandidateMetadata,
): string[] {
  return uniqueStrings(warnings).filter(
    (warning) => !isContradictoryWarning(warning, metadata),
  );
}

function normalizeText(value?: string): string {
  return value?.replace(/\s+/g, " ").trim().toLowerCase() ?? "";
}

function tokenSimilarity(a?: string, b?: string): number {
  const aTokens = new Set(
    normalizeText(a)
      .split(/[^a-z0-9]+/i)
      .filter((token) => token.length >= 3),
  );
  const bTokens = new Set(
    normalizeText(b)
      .split(/[^a-z0-9]+/i)
      .filter((token) => token.length >= 3),
  );

  if (aTokens.size === 0 || bTokens.size === 0) {
    return 0;
  }

  let intersection = 0;
  for (const token of aTokens) {
    if (bTokens.has(token)) {
      intersection += 1;
    }
  }

  const union = aTokens.size + bTokens.size - intersection;
  return union > 0 ? intersection / union : 0;
}

function normalizeAuthorName(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function hasAuthorOverlap(
  localAuthors: string[] | undefined,
  candidateAuthors: string[] | undefined,
): boolean {
  if (!localAuthors || !candidateAuthors) {
    return false;
  }

  const localSet = new Set(
    localAuthors
      .map((author) => normalizeAuthorName(author))
      .filter((author) => author.length > 0),
  );

  if (localSet.size === 0) {
    return false;
  }

  for (const candidate of candidateAuthors) {
    const normalized = normalizeAuthorName(candidate);
    if (normalized && localSet.has(normalized)) {
      return true;
    }
  }

  return false;
}

function adjustConfidenceByTitleAgreement(
  candidate: MetadataCandidate,
  localTitle?: string,
): MetadataCandidate {
  if (
    !candidate.matchedBy ||
    !localTitle ||
    !candidate.metadata.title ||
    candidate.source === "filename" ||
    candidate.source === "pdf_info"
  ) {
    return candidate;
  }

  const similarity = tokenSimilarity(localTitle, candidate.metadata.title);
  let adjusted = candidate.confidence;

  if (candidate.matchedBy === "isbn") {
    if (similarity < 0.12) {
      adjusted -= 0.45;
    } else if (similarity < 0.22) {
      adjusted -= 0.3;
    } else if (similarity < 0.32) {
      adjusted -= 0.15;
    }
  } else if (candidate.matchedBy === "query") {
    if (similarity < 0.15) {
      adjusted -= 0.35;
    } else if (similarity < 0.25) {
      adjusted -= 0.2;
    }
  }

  return {
    ...candidate,
    confidence: Math.max(0, Math.min(1, adjusted)),
  };
}

function pickField<T extends keyof CandidateMetadata>(
  candidates: MetadataCandidate[],
  field: T,
): { value: CandidateMetadata[T] | undefined; evidence?: SourceEvidence } {
  const ranked = candidates
    .filter((candidate) => hasValue(candidate.metadata[field]))
    .sort((a, b) => scoreCandidate(b) - scoreCandidate(a));

  if (ranked.length === 0) {
    return { value: undefined, evidence: undefined };
  }

  const winner = ranked[0];
  const value = winner.metadata[field];

  return {
    value,
    evidence: {
      source: winner.source,
      field,
      value: value as string | number | string[] | undefined,
      confidence: winner.confidence,
      note: winner.matchedBy ? `matched_by_${winner.matchedBy}` : undefined,
    },
  };
}

function mergeArrayField(
  candidates: MetadataCandidate[],
  field: "authors" | "publishers" | "categories",
): { value?: string[]; evidence?: SourceEvidence } {
  const ranked = candidates
    .filter((candidate) => Array.isArray(candidate.metadata[field]))
    .sort((a, b) => scoreCandidate(b) - scoreCandidate(a));

  if (ranked.length === 0) {
    return { value: undefined, evidence: undefined };
  }

  const topCandidates = ranked.slice(0, 3);
  const merged = uniqueStrings(
    topCandidates.flatMap((candidate) => candidate.metadata[field] ?? []),
  );
  const winner = ranked[0];

  return {
    value: merged.length > 0 ? merged : undefined,
    evidence: {
      source: winner.source,
      field,
      value: merged.length > 0 ? merged : undefined,
      confidence: winner.confidence,
      note: "merged_top_candidates",
    },
  };
}

function computeOverallConfidence(
  metadata: CandidateMetadata,
  evidence: SourceEvidence[],
): number {
  let coverage = 0;
  if (metadata.title) coverage += 0.24;
  if (metadata.authors && metadata.authors.length > 0) coverage += 0.18;
  if (metadata.isbn10 || metadata.isbn13) coverage += 0.24;
  if (metadata.publishedYear) coverage += 0.1;
  if (metadata.publishers && metadata.publishers.length > 0) coverage += 0.1;
  if (metadata.categories && metadata.categories.length > 0) coverage += 0.08;
  if (metadata.abstract) coverage += 0.03;
  if (metadata.language) coverage += 0.03;

  const evidenceBoost =
    evidence.length > 0
      ? evidence.reduce((sum, item) => sum + item.confidence, 0) /
        evidence.length
      : 0;

  const combined = coverage * 0.7 + evidenceBoost * 0.3;
  return Math.max(0, Math.min(1, combined));
}

export function mergeMetadataCandidates(args: {
  filePath: string;
  fileName: string;
  fileSizeBytes: number;
  local: LocalExtractionResult;
  catalogCandidates: MetadataCandidate[];
  extraWarnings?: string[];
}): BookMetadataResult {
  const allCandidates = [args.local.candidate, ...args.catalogCandidates];
  const adjustedCandidates = allCandidates.map((candidate) =>
    adjustConfidenceByTitleAgreement(
      candidate,
      args.local.candidate.metadata.title,
    ),
  );
  const evidence: SourceEvidence[] = [];

  const merged: CandidateMetadata = {};

  const title = pickField(adjustedCandidates, "title");
  if (title.value) merged.title = title.value;
  if (title.evidence) evidence.push(title.evidence);

  const subtitle = pickField(adjustedCandidates, "subtitle");
  if (subtitle.value) merged.subtitle = subtitle.value;
  if (subtitle.evidence) evidence.push(subtitle.evidence);

  const year = pickField(adjustedCandidates, "publishedYear");
  if (year.value) merged.publishedYear = year.value;
  if (year.evidence) evidence.push(year.evidence);

  const edition = pickField(adjustedCandidates, "edition");
  if (edition.value) merged.edition = edition.value;
  if (edition.evidence) evidence.push(edition.evidence);

  const isbn10 = pickField(adjustedCandidates, "isbn10");
  if (isbn10.value) merged.isbn10 = isbn10.value;
  if (isbn10.evidence) evidence.push(isbn10.evidence);

  const isbn13 = pickField(adjustedCandidates, "isbn13");
  if (isbn13.value) merged.isbn13 = isbn13.value;
  if (isbn13.evidence) evidence.push(isbn13.evidence);

  const abstract = pickField(adjustedCandidates, "abstract");
  if (abstract.value) merged.abstract = abstract.value;
  if (abstract.evidence) evidence.push(abstract.evidence);

  const language = pickField(adjustedCandidates, "language");
  if (language.value) merged.language = language.value;
  if (language.evidence) evidence.push(language.evidence);

  const authors = mergeArrayField(adjustedCandidates, "authors");
  if (authors.value) merged.authors = authors.value;
  if (authors.evidence) evidence.push(authors.evidence);

  const publishers = mergeArrayField(adjustedCandidates, "publishers");
  if (publishers.value) merged.publishers = publishers.value;
  if (publishers.evidence) evidence.push(publishers.evidence);

  const categories = mergeArrayField(adjustedCandidates, "categories");
  if (categories.value) merged.categories = categories.value;
  if (categories.evidence) evidence.push(categories.evidence);

  if (
    !merged.isbn10 &&
    !merged.isbn13 &&
    args.local.extractedIsbns.length === 1
  ) {
    const fallback = args.local.extractedIsbns[0];
    if (fallback.length === 10) {
      merged.isbn10 = fallback;
    } else if (fallback.length === 13) {
      merged.isbn13 = fallback;
    }
  }

  const missingFields = REQUIRED_FIELDS.filter(
    (field) => !hasValue(merged[field]),
  );
  const confidence = computeOverallConfidence(merged, evidence);
  const hasStrongExternalIsbnEvidence = evidence.some(
    (item) =>
      item.note === "matched_by_isbn" &&
      (item.source === "openlibrary" || item.source === "google_books"),
  );
  const localTitle = args.local.candidate.metadata.title;
  const localAuthors = args.local.candidate.metadata.authors;
  const localPublishedYear = args.local.candidate.metadata.publishedYear;
  const hasOpenAiWithLocalCorroboration = adjustedCandidates.some(
    (candidate) => {
      if (
        candidate.source !== "openai" ||
        candidate.confidence < 0.82 ||
        !candidate.metadata.title
      ) {
        return false;
      }

      if (!localTitle) {
        return (
          hasAuthorOverlap(localAuthors, candidate.metadata.authors) ||
          (Boolean(localPublishedYear) &&
            localPublishedYear === candidate.metadata.publishedYear)
        );
      }

      return (
        tokenSimilarity(localTitle, candidate.metadata.title) >= 0.15 ||
        hasAuthorOverlap(localAuthors, candidate.metadata.authors) ||
        (Boolean(localPublishedYear) &&
          localPublishedYear === candidate.metadata.publishedYear)
      );
    },
  );
  const hasStrongLocalEvidence =
    args.local.candidate.confidence >= 0.6 &&
    Boolean(args.local.candidate.metadata.title) &&
    Boolean(
      args.local.candidate.metadata.authors?.length ||
        args.local.candidate.metadata.isbn10 ||
        args.local.candidate.metadata.isbn13,
    );
  const hasStrongOpenAiEvidence = adjustedCandidates.some(
    (candidate) =>
      candidate.source === "openai" &&
      candidate.confidence >= 0.82 &&
      Boolean(candidate.metadata.title) &&
      Boolean(
        candidate.metadata.authors?.length ||
          candidate.metadata.isbn10 ||
          candidate.metadata.isbn13,
      ),
  );
  const hasStrongCatalogQueryEvidence = adjustedCandidates.some((candidate) => {
    if (
      candidate.matchedBy !== "query" ||
      (candidate.source !== "openlibrary" &&
        candidate.source !== "google_books")
    ) {
      return false;
    }

    if (
      candidate.confidence < 0.75 ||
      !localTitle ||
      !candidate.metadata.title ||
      (!candidate.metadata.isbn10 && !candidate.metadata.isbn13)
    ) {
      return false;
    }

    return tokenSimilarity(localTitle, candidate.metadata.title) >= 0.3;
  });

  let status: BookMetadataResult["status"] = "needs_review";
  if (!merged.title && !merged.isbn10 && !merged.isbn13) {
    status = "failed";
  } else if (
    confidence >= 0.75 &&
    Boolean(merged.title) &&
    Boolean(merged.isbn10 || merged.isbn13 || merged.authors?.length) &&
    (hasStrongExternalIsbnEvidence ||
      hasStrongLocalEvidence ||
      hasStrongCatalogQueryEvidence ||
      (hasStrongOpenAiEvidence && hasOpenAiWithLocalCorroboration))
  ) {
    status = "ok";
  }

  return {
    filePath: args.filePath,
    fileName: args.fileName,
    fileSizeBytes: args.fileSizeBytes,
    status,
    confidence,
    metadata: merged,
    missingFields,
    evidence,
    diagnostics: {
      extractedIsbns: args.local.extractedIsbns,
      usedIsbn: merged.isbn13 ?? merged.isbn10,
      warnings: resolveWarningsForFinalMetadata(
        [...args.local.warnings, ...(args.extraWarnings ?? [])],
        merged,
      ),
    },
  };
}
