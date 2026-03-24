import { extractBookMetadataFromPdf } from "./pipeline";
import type { BookMetadataResult } from "./types";

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return "Metadata extraction failed";
}

function stripPdfExtension(fileName: string): string {
  return fileName.replace(/\.[^.]+$/, "");
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

export type ExtractBookMetadataWithFallbackOptions = {
  fileName: string;
  fileBuffer: Buffer;
  filePath?: string;
  includeCatalog?: boolean;
  includeOpenLibrary?: boolean;
  includeGoogleBooks?: boolean;
  timeoutMs?: number;
  includeOpenAI?: boolean;
  openAIModel?: string;
  openAITimeoutMs?: number;
  googleBooksApiKey?: string;
};

export async function extractBookMetadataWithFallback(
  args: ExtractBookMetadataWithFallbackOptions,
): Promise<BookMetadataResult> {
  const resolvedOptions = {
    includeCatalog: args.includeCatalog ?? true,
    includeOpenLibrary: args.includeOpenLibrary ?? true,
    includeGoogleBooks: args.includeGoogleBooks ?? true,
    timeoutMs: args.timeoutMs ?? 9000,
    includeOpenAI: args.includeOpenAI ?? true,
    openAIModel: args.openAIModel ?? "gpt-5-mini",
    openAITimeoutMs: args.openAITimeoutMs ?? 180000,
    googleBooksApiKey:
      args.googleBooksApiKey ?? process.env.GOOGLE_BOOKS_API_KEY,
  };

  try {
    return await extractBookMetadataFromPdf({
      fileName: args.fileName,
      fileBuffer: args.fileBuffer,
      filePath: args.filePath,
      options: resolvedOptions,
    });
  } catch (primaryError) {
    console.error("[library.extract] full pipeline failed:", primaryError);

    try {
      const degraded = await extractBookMetadataFromPdf({
        fileName: args.fileName,
        fileBuffer: args.fileBuffer,
        filePath: args.filePath,
        options: {
          includeCatalog: resolvedOptions.includeCatalog,
          includeOpenLibrary: resolvedOptions.includeOpenLibrary,
          includeGoogleBooks: resolvedOptions.includeGoogleBooks,
          timeoutMs: resolvedOptions.timeoutMs,
          includeOpenAI: false,
          googleBooksApiKey: resolvedOptions.googleBooksApiKey,
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
          fileName: args.fileName,
          fileBuffer: args.fileBuffer,
          filePath: args.filePath,
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
          args.fileName,
          `Extraction pipeline failed. Fallback metadata was generated: ${getErrorMessage(finalError)}`,
        );
      }
    }
  }
}
