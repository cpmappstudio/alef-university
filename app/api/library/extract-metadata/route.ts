import { auth } from "@clerk/nextjs/server";
import { fetchQuery } from "convex/nextjs";
import { NextResponse } from "next/server";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { extractBookMetadataFromPdf } from "@/lib/books-metadata/pipeline";
import type { BookMetadataResult } from "@/lib/books-metadata/types";
import { resolveRoleFromClaims } from "@/lib/rbac";

export const runtime = "nodejs";
export const maxDuration = 300;

type Role = "student" | "professor" | "admin" | "superadmin";

function isAdminRole(role: Role | null): boolean {
  return role === "admin" || role === "superadmin";
}

function isPdfFile(file: File): boolean {
  if (file.type === "application/pdf") {
    return true;
  }

  return file.name.toLowerCase().endsWith(".pdf");
}

function isPdfFileName(fileName: string): boolean {
  return fileName.toLowerCase().endsWith(".pdf");
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return "Metadata extraction failed";
}

function stripPdfExtension(fileName: string): string {
  return fileName.replace(/\.[^.]+$/, "");
}

function toWellFormedText(value: string): string {
  if (typeof value.toWellFormed === "function") {
    return value.toWellFormed();
  }

  let output = "";

  for (let i = 0; i < value.length; i += 1) {
    const code = value.charCodeAt(i);

    if (code >= 0xd800 && code <= 0xdbff) {
      const next = value.charCodeAt(i + 1);
      if (next >= 0xdc00 && next <= 0xdfff) {
        output += value[i];
        output += value[i + 1];
        i += 1;
      } else {
        output += " ";
      }
      continue;
    }

    if (code >= 0xdc00 && code <= 0xdfff) {
      output += " ";
      continue;
    }

    output += value[i];
  }

  return output;
}

function normalizeText(value?: string): string {
  if (!value) {
    return "";
  }

  return toWellFormedText(value).trim();
}

function normalizeList(values?: string[]): string[] {
  if (!values) {
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

function fallbackResult(fileName: string, warning: string): BookMetadataResult {
  return {
    filePath: fileName,
    fileName,
    fileSizeBytes: 0,
    status: "needs_review",
    confidence: 0,
    metadata: {
      title: stripPdfExtension(fileName),
      authors: [],
      publishers: [],
      categories: [],
    },
    missingFields: [
      "title",
      "authors",
      "publishedYear",
      "publishers",
      "categories",
    ],
    evidence: [],
    diagnostics: {
      extractedIsbns: [],
      warnings: [warning],
    },
  };
}

function toApiResponse(result: BookMetadataResult) {
  return {
    status: result.status,
    confidence: Number.isFinite(result.confidence) ? result.confidence : 0,
    missingFields: result.missingFields,
    warnings: normalizeList(result.diagnostics.warnings),
    metadata: {
      title: normalizeText(result.metadata.title),
      subtitle: normalizeText(result.metadata.subtitle),
      authors: normalizeList(result.metadata.authors),
      publishers: normalizeList(result.metadata.publishers),
      publishedYear: result.metadata.publishedYear ?? null,
      edition: normalizeText(result.metadata.edition),
      isbn10: normalizeText(result.metadata.isbn10),
      isbn13: normalizeText(result.metadata.isbn13),
      abstract: normalizeText(result.metadata.abstract),
      language: normalizeText(result.metadata.language),
      categories: normalizeList(result.metadata.categories),
    },
  };
}

async function extractWithFallback(
  fileName: string,
  fileBuffer: Buffer,
): Promise<BookMetadataResult> {
  try {
    return await extractBookMetadataFromPdf({
      fileName,
      fileBuffer,
      options: {
        includeCatalog: true,
        includeOpenLibrary: true,
        includeGoogleBooks: true,
        timeoutMs: 9000,
        includeOpenAI: true,
        openAIModel: "gpt-4.1-mini",
        openAITimeoutMs: 180000,
        googleBooksApiKey: process.env.GOOGLE_BOOKS_API_KEY,
      },
    });
  } catch (primaryError) {
    console.error("[library.extract] full pipeline failed:", primaryError);

    try {
      const degraded = await extractBookMetadataFromPdf({
        fileName,
        fileBuffer,
        options: {
          includeCatalog: true,
          includeOpenLibrary: true,
          includeGoogleBooks: true,
          timeoutMs: 9000,
          includeOpenAI: false,
          googleBooksApiKey: process.env.GOOGLE_BOOKS_API_KEY,
        },
      });

      return {
        ...degraded,
        diagnostics: {
          ...degraded.diagnostics,
          warnings: [
            ...degraded.diagnostics.warnings,
            `OpenAI stage failed and was skipped: ${getErrorMessage(primaryError)}`,
          ],
        },
      };
    } catch (secondaryError) {
      console.error(
        "[library.extract] no-openai pipeline failed:",
        secondaryError,
      );

      try {
        const minimal = await extractBookMetadataFromPdf({
          fileName,
          fileBuffer,
          options: {
            includeCatalog: false,
            includeOpenLibrary: false,
            includeGoogleBooks: false,
            includeOpenAI: false,
          },
        });

        return {
          ...minimal,
          diagnostics: {
            ...minimal.diagnostics,
            warnings: [
              ...minimal.diagnostics.warnings,
              `Catalog stage failed and was skipped: ${getErrorMessage(secondaryError)}`,
            ],
          },
        };
      } catch (finalError) {
        console.error("[library.extract] minimal pipeline failed:", finalError);
        return fallbackResult(
          fileName,
          `Extraction pipeline failed. Fallback metadata was generated: ${getErrorMessage(finalError)}`,
        );
      }
    }
  }
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

  const token = await authData.getToken({ template: "convex" });
  const fetchOptions = token ? { token } : undefined;

  try {
    const formData = await request.formData();
    const storageIdValue = formData.get("storageId");
    const fileNameValue = formData.get("fileName");
    const fileValue = formData.get("file");

    let fileName = "";
    let fileBuffer: Buffer | null = null;

    if (
      typeof storageIdValue === "string" &&
      storageIdValue.trim().length > 0
    ) {
      if (!fetchOptions) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const storageId = storageIdValue.trim() as Id<"_storage">;
      fileName =
        typeof fileNameValue === "string" && fileNameValue.trim().length > 0
          ? fileNameValue.trim()
          : `${storageId}.pdf`;

      if (!isPdfFileName(fileName)) {
        return NextResponse.json(
          { error: "Only PDF files are allowed." },
          { status: 400 },
        );
      }

      const fileUrl = await fetchQuery(
        api.library.getLibraryUploadDownloadUrl,
        { storageId },
        fetchOptions,
      );

      const fileResponse = await fetch(fileUrl, { cache: "no-store" });
      if (!fileResponse.ok) {
        return NextResponse.json(
          {
            error: `Unable to read uploaded PDF (HTTP ${fileResponse.status}).`,
          },
          { status: 400 },
        );
      }

      fileBuffer = Buffer.from(await fileResponse.arrayBuffer());
    } else if (fileValue instanceof File) {
      const file = fileValue;
      fileName = file.name;

      if (!isPdfFile(file)) {
        return NextResponse.json(
          { error: "Only PDF files are allowed." },
          { status: 400 },
        );
      }

      if (file.size <= 0) {
        return NextResponse.json(
          { error: "The uploaded PDF is empty." },
          { status: 400 },
        );
      }

      fileBuffer = Buffer.from(await file.arrayBuffer());
    } else {
      return NextResponse.json(
        { error: "A PDF file or storageId is required." },
        { status: 400 },
      );
    }

    if (!fileBuffer || fileBuffer.byteLength <= 0) {
      return NextResponse.json(
        { error: "The uploaded PDF is empty." },
        { status: 400 },
      );
    }

    const result = await extractWithFallback(fileName, fileBuffer);
    return NextResponse.json(toApiResponse(result));
  } catch (error) {
    console.error("[library.extract] route error:", error);
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 500 },
    );
  }
}
