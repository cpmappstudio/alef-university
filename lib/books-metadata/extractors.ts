import path from "path";
import type { CandidateMetadata, LocalExtractionResult } from "./types";

const ISBN_LABELED_REGEX =
  /ISBN(?:-1[03])?\s*[:#]?\s*([0-9Xx][0-9Xx\-\s]{8,20}[0-9Xx])/gi;
const ISBN13_UNLABELED_REGEX = /\b97[89][0-9\-\s]{10,17}[0-9]\b/g;
const PREVIOUS_EDITION_SIGNALS = [
  "previous edition",
  "earlier edition",
  "prior edition",
  "old edition",
  "edition précédente",
  "edicion anterior",
  "edición anterior",
  "edicion previa",
  "edición previa",
  "de la edicion anterior",
  "de la edición anterior",
];

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function isReadableText(value: string): boolean {
  const normalized = normalizeWhitespace(value);
  if (!normalized) {
    return false;
  }

  let printable = 0;
  for (const char of normalized) {
    const code = char.charCodeAt(0);
    if (code >= 32 && code <= 126) {
      printable += 1;
      continue;
    }
    if (code >= 160) {
      printable += 1;
    }
  }

  const printableRatio = printable / normalized.length;
  if (printableRatio < 0.9) {
    return false;
  }

  const wordChars = (normalized.match(/[A-Za-z0-9\u00C0-\u024F]/g) ?? [])
    .length;
  return wordChars / normalized.length >= 0.45;
}

function normalizeText(value?: string): string {
  return normalizeWhitespace(value ?? "").toLowerCase();
}

function normalizeFoldedText(value?: string): string {
  return normalizeText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function uniqueStrings(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const normalized = normalizeWhitespace(value);
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

function isValidIsbn10(isbn10: string): boolean {
  if (!/^\d{9}[\dX]$/.test(isbn10)) {
    return false;
  }

  let sum = 0;
  for (let i = 0; i < 10; i += 1) {
    const character = isbn10[i];
    const value = character === "X" ? 10 : Number(character);
    sum += value * (10 - i);
  }

  return sum % 11 === 0;
}

function isValidIsbn13(isbn13: string): boolean {
  if (!/^\d{13}$/.test(isbn13)) {
    return false;
  }

  let sum = 0;
  for (let i = 0; i < 12; i += 1) {
    const value = Number(isbn13[i]);
    sum += i % 2 === 0 ? value : value * 3;
  }

  const checkDigit = (10 - (sum % 10)) % 10;
  return checkDigit === Number(isbn13[12]);
}

function isbn13From10(isbn10: string): string {
  const core = `978${isbn10.slice(0, 9)}`;
  let sum = 0;
  for (let i = 0; i < 12; i += 1) {
    const value = Number(core[i]);
    sum += i % 2 === 0 ? value : value * 3;
  }
  const checkDigit = (10 - (sum % 10)) % 10;
  return `${core}${checkDigit}`;
}

function isAmbiguousIsbnSet(isbns: string[]): boolean {
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
        unmatchedCount += 1;
        pendingIsbn13.delete(isbn);
      }
      continue;
    }

    unmatchedCount += 1;
  }

  return unmatchedCount > 1;
}

function shouldIgnoreIsbnMatch(
  text: string,
  matchIndex: number,
  length: number,
) {
  const start = Math.max(0, matchIndex - 120);
  const end = Math.min(text.length, matchIndex + length + 120);
  const context = normalizeFoldedText(text.slice(start, end));

  return PREVIOUS_EDITION_SIGNALS.some((signal) =>
    context.includes(normalizeFoldedText(signal)),
  );
}

type ParsedIsbn = {
  isbn10?: string;
  isbn13?: string;
};

function parseIsbn(raw: string): ParsedIsbn | null {
  const normalized = raw.toUpperCase().replace(/[^0-9X]/g, "");

  if (normalized.length === 10 && isValidIsbn10(normalized)) {
    return {
      isbn10: normalized,
      isbn13: isbn13From10(normalized),
    };
  }

  if (normalized.length === 13 && isValidIsbn13(normalized)) {
    return {
      isbn13: normalized,
    };
  }

  return null;
}

function extractIsbns(text: string): string[] {
  const found = new Set<string>();
  const matches = text.matchAll(ISBN_LABELED_REGEX);

  for (const match of matches) {
    const raw = match[1];
    const matchIndex = match.index ?? 0;
    if (shouldIgnoreIsbnMatch(text, matchIndex, match[0].length)) {
      continue;
    }
    const parsed = parseIsbn(raw);
    if (!parsed) {
      continue;
    }

    if (parsed.isbn13) {
      found.add(parsed.isbn13);
    }
    if (parsed.isbn10) {
      found.add(parsed.isbn10);
    }
  }

  if (found.size > 0) {
    return [...found];
  }

  // Fallback for PDFs that expose ISBNs without the ISBN label.
  // To reduce false positives from compressed binary streams,
  // we keep only repeated candidates or very small candidate sets.
  const unlabeledCounts = new Map<string, number>();
  for (const match of text.matchAll(ISBN13_UNLABELED_REGEX)) {
    const parsed = parseIsbn(match[0]);
    if (!parsed?.isbn13) {
      continue;
    }

    const key = parsed.isbn13;
    unlabeledCounts.set(key, (unlabeledCounts.get(key) ?? 0) + 1);
  }

  const uniqueUnlabeled = [...unlabeledCounts.keys()];
  if (uniqueUnlabeled.length > 6) {
    return [];
  }

  const filtered = uniqueUnlabeled.filter(
    (isbn) => (unlabeledCounts.get(isbn) ?? 0) >= 2,
  );

  if (filtered.length > 0) {
    return filtered;
  }

  if (uniqueUnlabeled.length <= 2) {
    return uniqueUnlabeled;
  }

  return [...found];
}

function decodePdfHexString(hexInput: string): string {
  const hex = hexInput.replace(/[^0-9A-Fa-f]/g, "");
  if (!hex) {
    return "";
  }

  const sanitized = hex.length % 2 === 0 ? hex : `${hex}0`;
  const bytes = new Uint8Array(sanitized.length / 2);

  for (let i = 0; i < sanitized.length; i += 2) {
    bytes[i / 2] = Number.parseInt(sanitized.slice(i, i + 2), 16);
  }

  if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
    const decoder = new TextDecoder("utf-16be", { fatal: false });
    return normalizeWhitespace(decoder.decode(bytes.slice(2)));
  }

  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) {
    const decoder = new TextDecoder("utf-16le", { fatal: false });
    return normalizeWhitespace(decoder.decode(bytes.slice(2)));
  }

  const utf8 = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
  if (utf8.includes("\uFFFD")) {
    return normalizeWhitespace(new TextDecoder("latin1").decode(bytes));
  }

  return normalizeWhitespace(utf8);
}

function decodePdfLiteralString(literal: string): string {
  let output = "";

  for (let i = 0; i < literal.length; i += 1) {
    const current = literal[i];
    if (current !== "\\") {
      output += current;
      continue;
    }

    const next = literal[i + 1];
    if (!next) {
      break;
    }

    if (next === "n") {
      output += "\n";
      i += 1;
      continue;
    }
    if (next === "r") {
      output += "\r";
      i += 1;
      continue;
    }
    if (next === "t") {
      output += "\t";
      i += 1;
      continue;
    }
    if (next === "b") {
      output += "\b";
      i += 1;
      continue;
    }
    if (next === "f") {
      output += "\f";
      i += 1;
      continue;
    }
    if (next === "\\" || next === "(" || next === ")") {
      output += next;
      i += 1;
      continue;
    }

    if (/[0-7]/.test(next)) {
      const octal = literal.slice(i + 1, i + 4).match(/^[0-7]{1,3}/)?.[0];
      if (octal) {
        output += String.fromCharCode(Number.parseInt(octal, 8));
        i += octal.length;
        continue;
      }
    }

    output += next;
    i += 1;
  }

  return normalizeWhitespace(output);
}

function decodePdfObjectValue(value: string): string {
  const trimmed = value.trim();
  let decoded: string;

  if (trimmed.startsWith("(") && trimmed.endsWith(")")) {
    decoded = decodePdfLiteralString(trimmed.slice(1, -1));
  } else if (trimmed.startsWith("<") && trimmed.endsWith(">")) {
    decoded = decodePdfHexString(trimmed.slice(1, -1));
  } else {
    decoded = normalizeWhitespace(trimmed);
  }

  return isReadableText(decoded) ? decoded : "";
}

type RawPdfInfo = {
  title?: string;
  author?: string;
  subject?: string;
  keywords?: string;
  creator?: string;
  producer?: string;
  creationDate?: string;
};

function extractPdfInfo(buffer: Buffer): RawPdfInfo {
  const binary = buffer.toString("latin1");
  const result: RawPdfInfo = {};
  const keyRegex =
    /\/(Title|Author|Subject|Keywords|Creator|Producer|CreationDate)\s*(\((?:\\.|[^\\)])*\)|<[^>]*>)/g;

  for (const match of binary.matchAll(keyRegex)) {
    const key = match[1];
    const rawValue = match[2];
    const decoded = decodePdfObjectValue(rawValue);
    if (!decoded) {
      continue;
    }

    if (key === "Title" && !result.title) {
      result.title = decoded;
    } else if (key === "Author" && !result.author) {
      result.author = decoded;
    } else if (key === "Subject" && !result.subject) {
      result.subject = decoded;
    } else if (key === "Keywords" && !result.keywords) {
      result.keywords = decoded;
    } else if (key === "Creator" && !result.creator) {
      result.creator = decoded;
    } else if (key === "Producer" && !result.producer) {
      result.producer = decoded;
    } else if (key === "CreationDate" && !result.creationDate) {
      result.creationDate = decoded;
    }
  }

  return result;
}

function parseAuthors(authorRaw?: string): string[] {
  if (!authorRaw) {
    return [];
  }

  return uniqueStrings(
    authorRaw
      .split(/;| and | y |&/i)
      .map((entry) => entry.replace(/^\s*by\s+/i, "").trim())
      .filter(Boolean),
  );
}

function extractYear(text: string): number | undefined {
  const match = text.match(/\b(1[6-9]\d{2}|20\d{2}|2100)\b/);
  if (!match) {
    return undefined;
  }
  return Number(match[1]);
}

function extractEdition(text?: string): string | undefined {
  if (!text) {
    return undefined;
  }

  const match = text.match(
    /\b(\d{1,2}(?:st|nd|rd|th)\s+ed(?:ition)?|\d{1,2}\s*edici[oó]n|revised\s+edition|second\s+edition|third\s+edition)\b/i,
  );
  return match ? normalizeWhitespace(match[1]) : undefined;
}

function categorizeFromText(text: string): string[] {
  const normalized = normalizeText(text);
  if (!normalized) {
    return [];
  }

  const buckets: Array<{ label: string; keywords: string[] }> = [
    {
      label: "theology",
      keywords: ["sermon", "homiletic", "theology", "church", "pastoral"],
    },
    {
      label: "law",
      keywords: ["derecho", "international law", "law", "jurid", "legal"],
    },
    {
      label: "history",
      keywords: ["history", "historia", "historical"],
    },
    {
      label: "archaeology",
      keywords: ["archaeology", "archeology", "holy land", "ancient"],
    },
    {
      label: "philosophy",
      keywords: ["philosophy", "social contract", "contrato social"],
    },
  ];

  const categories: string[] = [];
  for (const bucket of buckets) {
    if (bucket.keywords.some((keyword) => normalized.includes(keyword))) {
      categories.push(bucket.label);
    }
  }

  return categories;
}

function guessLanguage(text: string): string | undefined {
  const normalized = normalizeText(text);
  if (!normalized) {
    return undefined;
  }

  const spanishSignals = [" de ", " del ", " la ", " el ", " y ", " derecho "];
  const englishSignals = [" the ", " and ", " of ", " archaeology ", " law "];

  const spanishScore = spanishSignals.reduce(
    (score, token) => score + (normalized.includes(token) ? 1 : 0),
    0,
  );
  const englishScore = englishSignals.reduce(
    (score, token) => score + (normalized.includes(token) ? 1 : 0),
    0,
  );

  if (spanishScore === englishScore) {
    return undefined;
  }

  return spanishScore > englishScore ? "es" : "en";
}

function mergeDefinedMetadata(
  base: CandidateMetadata,
  next: CandidateMetadata,
): CandidateMetadata {
  const result: CandidateMetadata = { ...base };

  (Object.keys(next) as Array<keyof CandidateMetadata>).forEach((key) => {
    const value = next[key];
    if (value !== undefined) {
      (result as Record<string, unknown>)[key] = value;
    }
  });

  return result;
}

function fromFilename(fileName: string): CandidateMetadata {
  const baseName = path.parse(fileName).name;
  const normalizedSeparators = normalizeWhitespace(
    baseName.replace(/[_]+/g, " "),
  );
  const normalizedWords = normalizeWhitespace(
    normalizedSeparators.replace(/-/g, " "),
  );

  const titleAuthorSplit = normalizedSeparators.split(/\s+-\s+/);
  let title = normalizedWords;
  let authors: string[] = [];

  if (titleAuthorSplit.length >= 2) {
    const maybeAuthor = normalizeWhitespace(
      titleAuthorSplit[0].replace(/-/g, " "),
    );
    const maybeTitle = normalizeWhitespace(
      titleAuthorSplit.slice(1).join(" ").replace(/-/g, " "),
    );

    if (maybeAuthor && maybeTitle && maybeAuthor.split(" ").length <= 8) {
      authors = parseAuthors(maybeAuthor);
      title = maybeTitle;
    }
  }

  title = title.replace(/^(1[6-9]\d{2}|20\d{2})\s+/, "").trim();
  if (!title) {
    title = normalizedWords;
  }

  const year = extractYear(normalizedWords);
  const edition = extractEdition(normalizedWords);
  const categories = categorizeFromText(normalizedWords);

  return {
    title: title || undefined,
    authors: authors.length > 0 ? authors : undefined,
    publishedYear: year,
    edition,
    categories: categories.length > 0 ? categories : undefined,
    language: guessLanguage(normalizedWords),
  };
}

function fromPdfInfo(info: RawPdfInfo): CandidateMetadata {
  const title = info.title ? normalizeWhitespace(info.title) : undefined;
  const authors = parseAuthors(info.author);
  const subject = info.subject ? normalizeWhitespace(info.subject) : undefined;
  const keywords = info.keywords
    ? normalizeWhitespace(info.keywords)
    : undefined;

  const combined = [title, subject, keywords].filter(Boolean).join(" ");
  const categories = categorizeFromText(combined);

  const year =
    extractYear(info.creationDate ?? "") ??
    extractYear(info.title ?? "") ??
    extractYear(info.subject ?? "");

  const edition = extractEdition(
    [info.title, info.subject, info.keywords].filter(Boolean).join(" "),
  );

  return {
    title,
    authors: authors.length > 0 ? authors : undefined,
    abstract: subject,
    publishedYear: year,
    edition,
    categories: categories.length > 0 ? categories : undefined,
    language: guessLanguage(combined),
  };
}

function estimateLocalConfidence(metadata: CandidateMetadata): number {
  let confidence = 0.1;

  if (metadata.title) confidence += 0.25;
  if (metadata.authors && metadata.authors.length > 0) confidence += 0.18;
  if (metadata.isbn10 || metadata.isbn13) confidence += 0.32;
  if (metadata.publishedYear) confidence += 0.08;
  if (metadata.publishers && metadata.publishers.length > 0) confidence += 0.05;
  if (metadata.categories && metadata.categories.length > 0) confidence += 0.05;
  if (metadata.abstract) confidence += 0.04;

  return Math.max(0, Math.min(0.75, confidence));
}

export function extractLocalMetadata(
  fileName: string,
  fileBuffer: Buffer,
): LocalExtractionResult {
  const warnings: string[] = [];
  const filenameMetadata = fromFilename(fileName);
  const pdfInfo = extractPdfInfo(fileBuffer);
  const pdfMetadata = fromPdfInfo(pdfInfo);
  const binaryText = fileBuffer.toString("latin1");
  const extractedIsbns = extractIsbns(binaryText);

  const metadata: CandidateMetadata = {
    ...mergeDefinedMetadata(filenameMetadata, pdfMetadata),
  };

  if (pdfMetadata.authors && pdfMetadata.authors.length > 0) {
    metadata.authors = pdfMetadata.authors;
  } else if (filenameMetadata.authors && filenameMetadata.authors.length > 0) {
    metadata.authors = filenameMetadata.authors;
  }

  const categories = uniqueStrings([
    ...(filenameMetadata.categories ?? []),
    ...(pdfMetadata.categories ?? []),
  ]);

  if (categories.length > 0) {
    metadata.categories = categories;
  }

  const parsedIsbns = extractedIsbns
    .map((isbn) => parseIsbn(isbn))
    .filter((isbn): isbn is ParsedIsbn => Boolean(isbn));

  const hasAmbiguousIsbns = isAmbiguousIsbnSet(extractedIsbns);

  if (!hasAmbiguousIsbns) {
    for (const parsed of parsedIsbns) {
      if (parsed.isbn10 && !metadata.isbn10) {
        metadata.isbn10 = parsed.isbn10;
      }
      if (parsed.isbn13 && !metadata.isbn13) {
        metadata.isbn13 = parsed.isbn13;
      }
    }
  } else {
    warnings.push(
      "Multiple ISBN candidates were detected in the PDF; current edition ISBN could not be determined locally.",
    );
  }

  if (!metadata.title) {
    warnings.push("No title found in filename or PDF info dictionary.");
  }
  if (!metadata.authors || metadata.authors.length === 0) {
    warnings.push("No authors found in filename or PDF info dictionary.");
  }
  if (!metadata.isbn10 && !metadata.isbn13) {
    warnings.push("No valid ISBN found in PDF binary content.");
  }

  const candidate = {
    source:
      pdfMetadata.title ||
      (pdfMetadata.authors && pdfMetadata.authors.length > 0)
        ? ("pdf_info" as const)
        : ("filename" as const),
    confidence: estimateLocalConfidence(metadata),
    metadata,
  };

  return {
    candidate,
    extractedIsbns,
    warnings,
  };
}
