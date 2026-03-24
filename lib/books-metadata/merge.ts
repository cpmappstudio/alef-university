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

function normalizeComparableText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function canonicalizeNameList(values: string[]): string[] {
  const grouped = new Map<string, string[]>();

  for (const raw of values) {
    const normalized = raw.replace(/\s+/g, " ").trim();
    if (!normalized) {
      continue;
    }

    const signature = normalizeComparableText(normalized)
      .split(" ")
      .filter(Boolean)
      .sort()
      .join(" ");

    const variants = grouped.get(signature) ?? [];
    variants.push(normalized);
    grouped.set(signature, variants);
  }

  const pickPreferredVariant = (variants: string[]) =>
    variants.slice().sort((left, right) => {
      const leftScore =
        (left.includes(",") ? 0 : 4) +
        (left.includes(".") ? 2 : 0) +
        left.length;
      const rightScore =
        (right.includes(",") ? 0 : 4) +
        (right.includes(".") ? 2 : 0) +
        right.length;
      return rightScore - leftScore;
    })[0];

  return Array.from(grouped.values()).map(pickPreferredVariant);
}

function isLikelyUsernameLikeAuthor(value: string): boolean {
  const normalized = value.trim();
  if (!normalized) {
    return false;
  }

  return (
    !normalized.includes(" ") &&
    /^[a-z][a-z0-9._-]{2,24}$/.test(normalized) &&
    normalized === normalized.toLowerCase()
  );
}

function canonicalizePublisherList(values: string[]): string[] {
  return uniqueStrings(
    values.map((value) => value.replace(/^brand:\s*/i, "").trim()),
  );
}

function stripWrappingPunctuation(value: string): string {
  return value
    .trim()
    .replace(/^[([{]\s*|\s*[)\]}]$/g, "")
    .trim();
}

function looksLikeEditionStatement(value?: string): boolean {
  if (!value) {
    return false;
  }

  const normalized = normalizeComparableText(stripWrappingPunctuation(value));
  if (!normalized) {
    return false;
  }

  return /(edition|revised|revise?d|edicion|edicion revisada|edicion corregida|ed\b|printing|impresion|reimpresion|\b\d+(st|nd|rd|th)\b|\b\d+\s*ed\b)/.test(
    normalized,
  );
}

function splitTitleOnColon(
  title?: string,
): { title: string; subtitle: string } | null {
  if (!title || !title.includes(":")) {
    return null;
  }

  const [head, ...tail] = title.split(":");
  const mainTitle = head.replace(/\s+/g, " ").trim();
  const subtitle = tail.join(":").replace(/\s+/g, " ").trim();

  if (!mainTitle || !subtitle || looksLikeEditionStatement(subtitle)) {
    return null;
  }

  return { title: mainTitle, subtitle };
}

function looksLikeKeywordList(value?: string): boolean {
  if (!value) {
    return false;
  }

  const normalized = value.replace(/\s+/g, " ").trim();
  if (!normalized || /[.!?]/.test(normalized)) {
    return false;
  }

  const segments = normalized.split(/\s*,\s*/).filter(Boolean);
  return (
    segments.length >= 4 &&
    segments.every((segment) => segment.split(/\s+/).length <= 5)
  );
}

function isAmbiguousIsbnSet(isbns: string[]): boolean {
  const unique = [...new Set(isbns)];
  if (unique.length <= 1) {
    return false;
  }

  const isbn10s = unique.filter((isbn) => isbn.length === 10);
  const isbn13s = new Set(unique.filter((isbn) => isbn.length === 13));
  let unmatchedCount = 0;

  for (const isbn10 of isbn10s) {
    const paired = `978${isbn10.slice(0, 9)}`;
    let sum = 0;
    for (let index = 0; index < 12; index += 1) {
      const value = Number(paired[index]);
      sum += index % 2 === 0 ? value : value * 3;
    }
    const checkDigit = (10 - (sum % 10)) % 10;
    const pairedIsbn13 = `${paired}${checkDigit}`;

    if (isbn13s.has(pairedIsbn13)) {
      isbn13s.delete(pairedIsbn13);
      continue;
    }

    unmatchedCount += 1;
  }

  unmatchedCount += isbn13s.size;
  return unmatchedCount > 1;
}

function normalizeMergedMetadata(
  metadata: CandidateMetadata,
): CandidateMetadata {
  const normalized: CandidateMetadata = { ...metadata };

  if (normalized.authors?.length) {
    normalized.authors = canonicalizeNameList(
      normalized.authors.filter(
        (author) => !isLikelyUsernameLikeAuthor(author),
      ),
    );
    if (normalized.authors.length === 0) {
      normalized.authors = undefined;
    }
  }

  if (normalized.publishers?.length) {
    normalized.publishers = canonicalizePublisherList(normalized.publishers);
  }

  if (normalized.subtitle && looksLikeEditionStatement(normalized.subtitle)) {
    const subtitleEdition = stripWrappingPunctuation(normalized.subtitle);
    if (!normalized.edition) {
      normalized.edition = subtitleEdition;
    }
    normalized.subtitle = undefined;
  }

  if (normalized.edition) {
    normalized.edition = stripWrappingPunctuation(normalized.edition);
  }

  if (
    normalized.title &&
    (!normalized.subtitle || looksLikeEditionStatement(normalized.subtitle))
  ) {
    const split = splitTitleOnColon(normalized.title);
    if (split) {
      normalized.title = split.title;
      normalized.subtitle = split.subtitle;
    }
  }

  if (normalized.abstract && looksLikeKeywordList(normalized.abstract)) {
    normalized.abstract = undefined;
  }

  return normalized;
}

function alignTitleAndSubtitleWithLocal(args: {
  metadata: CandidateMetadata;
  localMetadata: CandidateMetadata;
}): CandidateMetadata {
  const { metadata, localMetadata } = args;

  if (!metadata.title || !metadata.subtitle || !localMetadata.title) {
    return metadata;
  }

  const localTitleSimilarityToTitle = tokenSimilarity(
    localMetadata.title,
    metadata.title,
  );
  const localTitleSimilarityToSubtitle = tokenSimilarity(
    localMetadata.title,
    metadata.subtitle,
  );

  if (
    localTitleSimilarityToSubtitle >= 0.75 &&
    localTitleSimilarityToTitle <= 0.35
  ) {
    return {
      ...metadata,
      title: metadata.subtitle,
      subtitle: metadata.title,
    };
  }

  return metadata;
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

function titleTokenCount(value?: string): number {
  if (!value) {
    return 0;
  }

  return normalizeText(value)
    .split(/[^a-z0-9]+/i)
    .filter((token) => token.length >= 3).length;
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

function isExternalCatalogQueryCandidate(
  candidate: MetadataCandidate,
): boolean {
  return (
    candidate.matchedBy === "query" &&
    (candidate.source === "openlibrary" || candidate.source === "google_books")
  );
}

function isLowDistinctivenessTitle(title?: string): boolean {
  return titleTokenCount(title) < 3;
}

function sanitizeWeakQueryCandidate(args: {
  candidate: MetadataCandidate;
  localMetadata: CandidateMetadata;
}): MetadataCandidate {
  const { candidate, localMetadata } = args;

  if (!isExternalCatalogQueryCandidate(candidate)) {
    return candidate;
  }

  const localTitle = localMetadata.title;
  if (!localTitle || !candidate.metadata.title) {
    return candidate;
  }

  const hasAuthorCorroboration = hasAuthorOverlap(
    localMetadata.authors,
    candidate.metadata.authors,
  );
  const hasYearCorroboration =
    Boolean(localMetadata.publishedYear) &&
    localMetadata.publishedYear === candidate.metadata.publishedYear;
  const hasIsbnCorroboration =
    (Boolean(localMetadata.isbn13) &&
      localMetadata.isbn13 === candidate.metadata.isbn13) ||
    (Boolean(localMetadata.isbn10) &&
      localMetadata.isbn10 === candidate.metadata.isbn10);
  const hasLocalCorroboration =
    hasAuthorCorroboration || hasYearCorroboration || hasIsbnCorroboration;

  if (hasLocalCorroboration || !isLowDistinctivenessTitle(localTitle)) {
    if (hasIsbnCorroboration) {
      return candidate;
    }

    return {
      ...candidate,
      confidence: Math.min(
        candidate.confidence,
        hasYearCorroboration ? 0.64 : 0.56,
      ),
      metadata: {
        title: candidate.metadata.title,
        authors: candidate.metadata.authors,
        publishers: candidate.metadata.publishers,
        language: candidate.metadata.language,
        categories: candidate.metadata.categories,
        publishedYear: hasYearCorroboration
          ? candidate.metadata.publishedYear
          : undefined,
        subtitle: localMetadata.subtitle
          ? candidate.metadata.subtitle
          : undefined,
        edition: localMetadata.edition ? candidate.metadata.edition : undefined,
      },
    };
  }

  // For generic titles without local corroboration, keep only title-level hint.
  return {
    ...candidate,
    confidence: Math.min(candidate.confidence, 0.42),
    metadata: {},
  };
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

  const winner = ranked[0];
  const shouldUseWinnerOnly =
    isExternalCatalogQueryCandidate(winner) ||
    ((field === "authors" || field === "publishers") &&
      (winner.matchedBy === "isbn" ||
        (winner.source === "openai" && winner.confidence >= 0.8))) ||
    (field === "categories" &&
      ((winner.source === "openai" && winner.confidence >= 0.8) ||
        winner.matchedBy === "isbn"));

  const merged = shouldUseWinnerOnly
    ? uniqueStrings(winner.metadata[field] ?? [])
    : uniqueStrings(
        ranked
          .slice(0, 3)
          .flatMap((candidate) => candidate.metadata[field] ?? []),
      );

  return {
    value: merged.length > 0 ? merged : undefined,
    evidence: {
      source: winner.source,
      field,
      value: merged.length > 0 ? merged : undefined,
      confidence: winner.confidence,
      note: shouldUseWinnerOnly
        ? field === "categories" &&
          winner.source === "openai" &&
          winner.confidence >= 0.8
          ? "top_openai_candidate"
          : "matched_by_query_top_candidate"
        : "merged_top_candidates",
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
  const adjustedCandidates = allCandidates
    .map((candidate) =>
      adjustConfidenceByTitleAgreement(
        candidate,
        args.local.candidate.metadata.title,
      ),
    )
    .map((candidate) =>
      sanitizeWeakQueryCandidate({
        candidate,
        localMetadata: args.local.candidate.metadata,
      }),
    );
  const evidence: SourceEvidence[] = [];
  const derivedWarnings: string[] = [];

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
  const ambiguousLocalIsbns = isAmbiguousIsbnSet(args.local.extractedIsbns);
  const shouldSuppressCatalogIsbn10 =
    ambiguousLocalIsbns &&
    isbn10.evidence?.note === "matched_by_isbn" &&
    (isbn10.evidence.source === "openlibrary" ||
      isbn10.evidence.source === "google_books");
  if (isbn10.value && !shouldSuppressCatalogIsbn10) {
    merged.isbn10 = isbn10.value;
  }
  if (isbn10.evidence && !shouldSuppressCatalogIsbn10) {
    evidence.push(isbn10.evidence);
  }

  const isbn13 = pickField(adjustedCandidates, "isbn13");
  const shouldSuppressCatalogIsbn13 =
    ambiguousLocalIsbns &&
    isbn13.evidence?.note === "matched_by_isbn" &&
    (isbn13.evidence.source === "openlibrary" ||
      isbn13.evidence.source === "google_books");
  if (isbn13.value && !shouldSuppressCatalogIsbn13) {
    merged.isbn13 = isbn13.value;
  }
  if (isbn13.evidence && !shouldSuppressCatalogIsbn13) {
    evidence.push(isbn13.evidence);
  }

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

  if (shouldSuppressCatalogIsbn10 || shouldSuppressCatalogIsbn13) {
    derivedWarnings.push(
      "Multiple ISBN candidates were detected locally; catalog ISBNs were withheld to avoid selecting a previous or mismatched edition.",
    );
  }

  const normalizedMerged = alignTitleAndSubtitleWithLocal({
    metadata: normalizeMergedMetadata(merged),
    localMetadata: args.local.candidate.metadata,
  });

  if (
    !normalizedMerged.isbn10 &&
    !normalizedMerged.isbn13 &&
    args.local.extractedIsbns.length === 1
  ) {
    const fallback = args.local.extractedIsbns[0];
    if (fallback.length === 10) {
      normalizedMerged.isbn10 = fallback;
    } else if (fallback.length === 13) {
      normalizedMerged.isbn13 = fallback;
    }
  }

  const missingFields = REQUIRED_FIELDS.filter(
    (field) => !hasValue(normalizedMerged[field]),
  );
  const confidence = computeOverallConfidence(normalizedMerged, evidence);
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

    const hasLocalCorroboration =
      hasAuthorOverlap(localAuthors, candidate.metadata.authors) ||
      (Boolean(localPublishedYear) &&
        localPublishedYear === candidate.metadata.publishedYear);

    if (!hasLocalCorroboration) {
      return false;
    }

    return tokenSimilarity(localTitle, candidate.metadata.title) >= 0.45;
  });

  let status: BookMetadataResult["status"] = "needs_review";
  if (
    !normalizedMerged.title &&
    !normalizedMerged.isbn10 &&
    !normalizedMerged.isbn13
  ) {
    status = "failed";
  } else if (
    confidence >= 0.75 &&
    Boolean(normalizedMerged.title) &&
    Boolean(
      normalizedMerged.isbn10 ||
        normalizedMerged.isbn13 ||
        normalizedMerged.authors?.length,
    ) &&
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
    metadata: normalizedMerged,
    missingFields,
    evidence,
    diagnostics: {
      extractedIsbns: args.local.extractedIsbns,
      usedIsbn: normalizedMerged.isbn13 ?? normalizedMerged.isbn10,
      warnings: resolveWarningsForFinalMetadata(
        [
          ...args.local.warnings,
          ...(args.extraWarnings ?? []),
          ...derivedWarnings,
        ],
        normalizedMerged,
      ),
    },
  };
}
