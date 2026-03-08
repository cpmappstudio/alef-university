import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { lookupCatalogMetadata } from "@/lib/books-metadata/catalogs";
import type { CandidateMetadata, MetadataCandidate } from "@/lib/books-metadata/types";
import { resolveRoleFromClaims } from "@/lib/rbac";

export const runtime = "nodejs";
export const maxDuration = 60;

type Role = "student" | "professor" | "admin" | "superadmin";

type LookupIsbnRequest = {
  isbn?: string;
  isbn10?: string;
  isbn13?: string;
  title?: string;
  author?: string;
};

function isAdminRole(role: Role | null): boolean {
  return role === "admin" || role === "superadmin";
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeText(value?: string): string {
  if (!value) {
    return "";
  }

  return normalizeWhitespace(value);
}

function normalizeList(values?: string[]): string[] {
  if (!values || values.length === 0) {
    return [];
  }

  const seen = new Set<string>();
  const output: string[] = [];

  for (const raw of values) {
    const normalized = normalizeText(raw);
    if (!normalized) {
      continue;
    }

    const key = normalized.toLowerCase();
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    output.push(normalized);
  }

  return output;
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

function parseIsbn(raw: string): { isbn10?: string; isbn13?: string } | null {
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

function buildLookupIsbns(body: LookupIsbnRequest): string[] {
  const unique = new Set<string>();
  const rawCandidates = [body.isbn, body.isbn10, body.isbn13];

  for (const raw of rawCandidates) {
    if (!raw) {
      continue;
    }

    const parsed = parseIsbn(raw);
    if (!parsed) {
      continue;
    }

    if (parsed.isbn13) {
      unique.add(parsed.isbn13);
    }
    if (parsed.isbn10) {
      unique.add(parsed.isbn10);
    }
  }

  return [...unique];
}

function scoreCandidate(candidate: MetadataCandidate): number {
  const base = candidate.confidence;
  return candidate.matchedBy === "isbn" ? base + 1 : base;
}

function pickBestCandidate(candidates: MetadataCandidate[]): MetadataCandidate | null {
  if (candidates.length === 0) {
    return null;
  }

  return candidates
    .slice()
    .sort((left, right) => scoreCandidate(right) - scoreCandidate(left))[0];
}

function toResponseMetadata(metadata: CandidateMetadata) {
  return {
    title: normalizeText(metadata.title),
    subtitle: normalizeText(metadata.subtitle),
    authors: normalizeList(metadata.authors),
    publishers: normalizeList(metadata.publishers),
    publishedYear: metadata.publishedYear ?? null,
    edition: normalizeText(metadata.edition),
    isbn10: normalizeText(metadata.isbn10),
    isbn13: normalizeText(metadata.isbn13),
    abstract: normalizeText(metadata.abstract),
    language: normalizeText(metadata.language),
    categories: normalizeList(metadata.categories),
  };
}

export async function POST(request: Request) {
  const authData = await auth();

  if (!authData.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = resolveRoleFromClaims(
    authData.sessionClaims as Record<string, unknown> | null | undefined,
  ) as Role | null;

  if (!isAdminRole(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: LookupIsbnRequest;
  try {
    body = (await request.json()) as LookupIsbnRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const isbns = buildLookupIsbns(body);
  if (isbns.length === 0) {
    return NextResponse.json({ error: "Provide a valid ISBN-10 or ISBN-13." }, { status: 400 });
  }

  const candidates = await lookupCatalogMetadata({
    title: normalizeText(body.title) || undefined,
    author: normalizeText(body.author) || undefined,
    isbns,
    includeOpenLibrary: true,
    includeGoogleBooks: true,
    timeoutMs: 9000,
    googleBooksApiKey: process.env.GOOGLE_BOOKS_API_KEY,
  });

  const bestCandidate = pickBestCandidate(candidates);
  if (!bestCandidate) {
    return NextResponse.json({ error: "No catalog match found for this ISBN." }, { status: 404 });
  }

  return NextResponse.json({
    source: bestCandidate.source,
    matchedBy: bestCandidate.matchedBy ?? "query",
    confidence: bestCandidate.confidence,
    metadata: toResponseMetadata(bestCandidate.metadata),
  });
}
