import type { CandidateMetadata } from "@/lib/books-metadata/types";
import type {
  LibraryBookRecord,
  LibraryRawMetadataRecord,
} from "@/lib/library/types";

function normalizeText(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim().replace(/\s+/g, " ");
  return normalized.length > 0 ? normalized : undefined;
}

function normalizeList(values: unknown): string[] {
  if (!Array.isArray(values)) {
    return [];
  }

  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const normalized = normalizeText(value);
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

function normalizeYear(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.floor(value);
  }

  if (typeof value === "string") {
    const asNumber = Number.parseInt(value, 10);
    if (Number.isFinite(asNumber)) {
      return asNumber;
    }
  }

  return undefined;
}

function normalizeConfidence(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(1, value));
}

function normalizeStatus(value: unknown): LibraryBookRecord["status"] {
  if (value === "ok" || value === "needs_review" || value === "failed") {
    return value;
  }

  return "needs_review";
}

function stripExtension(fileName: string): string {
  return fileName.replace(/\.[^/.]+$/, "");
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function toPublicHref(filePath?: string): string | undefined {
  if (!filePath) {
    return undefined;
  }

  const normalized = filePath.replace(/\\/g, "/");
  const publicMarker = "/public/";
  const markerIndex = normalized.lastIndexOf(publicMarker);

  if (markerIndex === -1) {
    return undefined;
  }

  const publicRelativePath = normalized.slice(
    markerIndex + publicMarker.length,
  );
  if (!publicRelativePath) {
    return undefined;
  }

  return `/${encodeURI(publicRelativePath)}`;
}

function buildCoverUrl(isbn13?: string, isbn10?: string): string | undefined {
  const isbn = isbn13 ?? isbn10;
  if (!isbn) {
    return undefined;
  }

  return `https://books.google.com/books/content?vid=ISBN${isbn}&printsec=frontcover&img=1&zoom=1&source=gbs_api`;
}

function buildBookId(args: {
  filePath?: string;
  fileName: string;
  title: string;
  isbn13?: string;
  isbn10?: string;
  index: number;
}): string {
  const base =
    normalizeText(args.filePath) ??
    normalizeText(args.isbn13) ??
    normalizeText(args.isbn10) ??
    normalizeText(args.title) ??
    args.fileName;

  const slug = slugify(base);
  if (slug) {
    return slug;
  }

  return `book-${args.index + 1}`;
}

function mapRecord(
  record: LibraryRawMetadataRecord,
  index: number,
): LibraryBookRecord | null {
  const metadata = (record.metadata ?? {}) as Partial<CandidateMetadata>;

  const fileName =
    normalizeText(record.fileName) ??
    normalizeText(record.filePath?.split("/").pop()) ??
    `book-${index + 1}.pdf`;

  const title = normalizeText(metadata.title) ?? stripExtension(fileName);
  const subtitle = normalizeText(metadata.subtitle);
  const authors = normalizeList(metadata.authors);
  const publishers = normalizeList(metadata.publishers);
  const categories = normalizeList(metadata.categories);

  const isbn13 = normalizeText(metadata.isbn13);
  const isbn10 = normalizeText(metadata.isbn10);

  const book: LibraryBookRecord = {
    id: buildBookId({
      filePath: normalizeText(record.filePath),
      fileName,
      title,
      isbn13,
      isbn10,
      index,
    }),
    fileName,
    filePath: normalizeText(record.filePath),
    fileSizeBytes:
      typeof record.fileSizeBytes === "number"
        ? record.fileSizeBytes
        : undefined,
    status: normalizeStatus(record.status),
    confidence: normalizeConfidence(record.confidence),
    title,
    subtitle,
    authors,
    publishers,
    publishedYear: normalizeYear(metadata.publishedYear),
    edition: normalizeText(metadata.edition),
    isbn10,
    isbn13,
    abstract: normalizeText(metadata.abstract),
    language: normalizeText(metadata.language),
    categories,
    href: toPublicHref(normalizeText(record.filePath)),
    coverUrl: buildCoverUrl(isbn13, isbn10),
  };

  return book;
}

function dedupeBooks(books: LibraryBookRecord[]): LibraryBookRecord[] {
  const seen = new Map<string, number>();

  return books.map((book) => {
    const count = seen.get(book.id) ?? 0;
    seen.set(book.id, count + 1);

    if (count === 0) {
      return book;
    }

    return {
      ...book,
      id: `${book.id}-${count + 1}`,
    };
  });
}

export function parseLibraryBooksJsonl(content: string): LibraryBookRecord[] {
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const books: LibraryBookRecord[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];

    try {
      const parsed = JSON.parse(line) as LibraryRawMetadataRecord;
      const mapped = mapRecord(parsed, index);

      if (mapped) {
        books.push(mapped);
      }
    } catch {
      // Ignore invalid JSONL lines to keep the catalog resilient.
    }
  }

  return dedupeBooks(books).sort((a, b) =>
    a.title.localeCompare(b.title, undefined, { sensitivity: "base" }),
  );
}
