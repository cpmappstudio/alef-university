import type { CandidateMetadata, MetadataCandidate } from "./types";

type CatalogLookupArgs = {
  title?: string;
  author?: string;
  isbns: string[];
  includeOpenLibrary: boolean;
  includeGoogleBooks: boolean;
  timeoutMs?: number;
  googleBooksApiKey?: string;
};

type OpenLibraryBook = {
  title?: string;
  subtitle?: string;
  authors?: Array<{ name?: string }>;
  publishers?: Array<{ name?: string }>;
  publish_date?: string;
  subjects?: Array<{ name?: string }>;
};

type OpenLibrarySearchDoc = {
  title?: string;
  author_name?: string[];
  publisher?: string[];
  first_publish_year?: number;
  isbn?: string[];
  language?: string[];
  subject?: string[];
};

type OpenLibrarySearchResponse = {
  docs?: OpenLibrarySearchDoc[];
};

type GoogleBookVolumeInfo = {
  title?: string;
  subtitle?: string;
  authors?: string[];
  publisher?: string;
  publishedDate?: string;
  description?: string;
  language?: string;
  categories?: string[];
  industryIdentifiers?: Array<{ type?: string; identifier?: string }>;
};

type GoogleBooksResponse = {
  items?: Array<{ volumeInfo?: GoogleBookVolumeInfo }>;
};

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeText(value?: string): string {
  return normalizeWhitespace(value ?? "").toLowerCase();
}

function uniqueStrings(values: string[]): string[] {
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

  return output;
}

function extractYear(value?: string): number | undefined {
  if (!value) {
    return undefined;
  }
  const match = value.match(/\b(1[6-9]\d{2}|20\d{2}|2100)\b/);
  if (!match) {
    return undefined;
  }
  return Number(match[1]);
}

function splitWords(value?: string): Set<string> {
  if (!value) {
    return new Set<string>();
  }
  return new Set(
    normalizeText(value)
      .split(/[^a-z0-9]+/i)
      .filter((token) => token.length >= 3),
  );
}

function tokenSimilarity(a?: string, b?: string): number {
  const aTokens = splitWords(a);
  const bTokens = splitWords(b);

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
  if (union === 0) {
    return 0;
  }
  return intersection / union;
}

async function fetchJson<T>(url: string, timeoutMs: number): Promise<T | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as T;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function metadataFromOpenLibraryBook(book: OpenLibraryBook): CandidateMetadata {
  const authors = uniqueStrings(
    (book.authors ?? []).map((entry) => entry.name ?? ""),
  );
  const publishers = uniqueStrings(
    (book.publishers ?? []).map((entry) => entry.name ?? ""),
  );
  const categories = uniqueStrings(
    (book.subjects ?? []).map((entry) => entry.name ?? ""),
  );

  return {
    title: book.title ? normalizeWhitespace(book.title) : undefined,
    subtitle: book.subtitle ? normalizeWhitespace(book.subtitle) : undefined,
    authors: authors.length > 0 ? authors : undefined,
    publishers: publishers.length > 0 ? publishers : undefined,
    publishedYear: extractYear(book.publish_date),
    categories: categories.length > 0 ? categories : undefined,
  };
}

function metadataFromOpenLibraryDoc(
  doc: OpenLibrarySearchDoc,
): CandidateMetadata {
  const authors = uniqueStrings(doc.author_name ?? []);
  const publishers = uniqueStrings(doc.publisher ?? []);
  const categories = uniqueStrings(doc.subject ?? []);
  const language = doc.language?.[0];

  return {
    title: doc.title ? normalizeWhitespace(doc.title) : undefined,
    authors: authors.length > 0 ? authors : undefined,
    publishers: publishers.length > 0 ? publishers : undefined,
    publishedYear: doc.first_publish_year,
    language,
    categories: categories.length > 0 ? categories : undefined,
  };
}

function metadataFromGoogleVolume(
  volume: GoogleBookVolumeInfo,
): CandidateMetadata {
  const authors = uniqueStrings(volume.authors ?? []);
  const categories = uniqueStrings(volume.categories ?? []);
  const publishers = volume.publisher
    ? [normalizeWhitespace(volume.publisher)]
    : [];

  let isbn10: string | undefined;
  let isbn13: string | undefined;

  for (const identifier of volume.industryIdentifiers ?? []) {
    if (identifier.type === "ISBN_10" && identifier.identifier) {
      isbn10 = identifier.identifier.replace(/[^0-9Xx]/g, "").toUpperCase();
    }
    if (identifier.type === "ISBN_13" && identifier.identifier) {
      isbn13 = identifier.identifier.replace(/[^0-9]/g, "");
    }
  }

  return {
    title: volume.title ? normalizeWhitespace(volume.title) : undefined,
    subtitle: volume.subtitle
      ? normalizeWhitespace(volume.subtitle)
      : undefined,
    authors: authors.length > 0 ? authors : undefined,
    publishers: publishers.length > 0 ? publishers : undefined,
    publishedYear: extractYear(volume.publishedDate),
    abstract: volume.description
      ? normalizeWhitespace(volume.description)
      : undefined,
    language: volume.language
      ? normalizeWhitespace(volume.language)
      : undefined,
    categories: categories.length > 0 ? categories : undefined,
    isbn10,
    isbn13,
  };
}

function confidenceForQueryMatch(
  queryTitle: string | undefined,
  queryAuthor: string | undefined,
  candidateTitle: string | undefined,
  candidateAuthors: string[] | undefined,
): number {
  const titleScore = tokenSimilarity(queryTitle, candidateTitle);
  const authorScore = tokenSimilarity(queryAuthor, candidateAuthors?.join(" "));
  const score =
    titleScore * 0.72 + authorScore * 0.2 + (titleScore > 0 ? 0.08 : 0);

  return Math.max(0.05, Math.min(0.9, score));
}

async function lookupOpenLibraryByIsbn(
  isbns: string[],
  timeoutMs: number,
): Promise<MetadataCandidate[]> {
  if (isbns.length === 0) {
    return [];
  }

  const bibkeys = isbns.map((isbn) => `ISBN:${isbn}`).join(",");
  const url = `https://openlibrary.org/api/books?bibkeys=${encodeURIComponent(
    bibkeys,
  )}&format=json&jscmd=data`;
  const data = await fetchJson<Record<string, OpenLibraryBook>>(url, timeoutMs);
  if (!data) {
    return [];
  }

  const candidates: MetadataCandidate[] = [];

  for (const isbn of isbns) {
    const key = `ISBN:${isbn}`;
    const book = data[key];
    if (!book) {
      continue;
    }

    const metadata = metadataFromOpenLibraryBook(book);
    metadata.isbn13 = isbn.length === 13 ? isbn : metadata.isbn13;
    metadata.isbn10 = isbn.length === 10 ? isbn : metadata.isbn10;

    candidates.push({
      source: "openlibrary",
      matchedBy: "isbn",
      confidence: 0.96,
      metadata,
    });
  }

  return candidates;
}

async function searchOpenLibraryByQuery(
  title: string | undefined,
  author: string | undefined,
  timeoutMs: number,
): Promise<MetadataCandidate[]> {
  if (!title) {
    return [];
  }

  const params = new URLSearchParams();
  params.set("title", title);
  if (author) {
    params.set("author", author);
  }
  params.set("limit", "5");
  params.set(
    "fields",
    "title,author_name,publisher,first_publish_year,isbn,language,subject",
  );

  const url = `https://openlibrary.org/search.json?${params.toString()}`;
  const data = await fetchJson<OpenLibrarySearchResponse>(url, timeoutMs);
  if (!data?.docs || data.docs.length === 0) {
    return [];
  }

  const candidates = data.docs.slice(0, 3).map((doc) => {
    const metadata = metadataFromOpenLibraryDoc(doc);
    const isbn13 = (doc.isbn ?? []).find((entry) => entry.length === 13);
    const isbn10 = (doc.isbn ?? []).find((entry) => entry.length === 10);
    metadata.isbn13 = isbn13 ?? metadata.isbn13;
    metadata.isbn10 = isbn10 ?? metadata.isbn10;

    return {
      source: "openlibrary" as const,
      matchedBy: "query" as const,
      confidence: confidenceForQueryMatch(
        title,
        author,
        metadata.title,
        metadata.authors,
      ),
      metadata,
    };
  });

  return candidates.filter((candidate) => candidate.confidence >= 0.28);
}

async function lookupGoogleBooksByQuery(
  query: string,
  timeoutMs: number,
  apiKey?: string,
): Promise<GoogleBookVolumeInfo[]> {
  const params = new URLSearchParams();
  params.set("q", query);
  params.set("maxResults", "5");
  params.set("printType", "books");
  if (apiKey) {
    params.set("key", apiKey);
  }

  const url = `https://www.googleapis.com/books/v1/volumes?${params.toString()}`;
  const data = await fetchJson<GoogleBooksResponse>(url, timeoutMs);
  if (!data?.items || data.items.length === 0) {
    return [];
  }

  return data.items
    .map((item) => item.volumeInfo)
    .filter((volume): volume is GoogleBookVolumeInfo => Boolean(volume));
}

async function lookupGoogleBooksByIsbn(
  isbns: string[],
  timeoutMs: number,
  apiKey?: string,
): Promise<MetadataCandidate[]> {
  const candidates: MetadataCandidate[] = [];

  for (const isbn of isbns) {
    const query = `isbn:${isbn}`;
    const volumes = await lookupGoogleBooksByQuery(query, timeoutMs, apiKey);
    if (volumes.length === 0) {
      continue;
    }

    const metadata = metadataFromGoogleVolume(volumes[0]);
    if (!metadata.isbn13 && isbn.length === 13) {
      metadata.isbn13 = isbn;
    }
    if (!metadata.isbn10 && isbn.length === 10) {
      metadata.isbn10 = isbn;
    }

    candidates.push({
      source: "google_books",
      matchedBy: "isbn",
      confidence: 0.94,
      metadata,
    });
  }

  return candidates;
}

async function searchGoogleBooksByQuery(
  title: string | undefined,
  author: string | undefined,
  timeoutMs: number,
  apiKey?: string,
): Promise<MetadataCandidate[]> {
  if (!title) {
    return [];
  }

  const queryParts = [`intitle:${title}`];
  if (author) {
    queryParts.push(`inauthor:${author}`);
  }

  const volumes = await lookupGoogleBooksByQuery(
    queryParts.join("+"),
    timeoutMs,
    apiKey,
  );

  const candidates = volumes.slice(0, 3).map((volume) => {
    const metadata = metadataFromGoogleVolume(volume);
    return {
      source: "google_books" as const,
      matchedBy: "query" as const,
      confidence: confidenceForQueryMatch(
        title,
        author,
        metadata.title,
        metadata.authors,
      ),
      metadata,
    };
  });

  return candidates.filter((candidate) => candidate.confidence >= 0.28);
}

export async function lookupCatalogMetadata(
  args: CatalogLookupArgs,
): Promise<MetadataCandidate[]> {
  const timeoutMs = args.timeoutMs ?? 9000;
  const tasks: Array<Promise<MetadataCandidate[]>> = [];
  const title = args.title ? normalizeWhitespace(args.title) : undefined;
  const author = args.author ? normalizeWhitespace(args.author) : undefined;

  if (args.includeOpenLibrary) {
    tasks.push(lookupOpenLibraryByIsbn(args.isbns, timeoutMs));
    tasks.push(searchOpenLibraryByQuery(title, author, timeoutMs));
  }

  if (args.includeGoogleBooks) {
    tasks.push(
      lookupGoogleBooksByIsbn(args.isbns, timeoutMs, args.googleBooksApiKey),
    );
    tasks.push(
      searchGoogleBooksByQuery(
        title,
        author,
        timeoutMs,
        args.googleBooksApiKey,
      ),
    );
  }

  const batches = await Promise.all(tasks);
  return batches.flat();
}
