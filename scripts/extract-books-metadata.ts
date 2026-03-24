/**
 * Extract book metadata from PDF files using a staged approach:
 * 1) Local extraction (filename + PDF info dictionary + binary ISBN scan)
 * 2) Optional enrichment via Open Library / Google Books
 * 3) Field-level merge with confidence scoring and review status
 * 4) Optional OpenAI fallback on sampled PDF pages (not full document)
 *
 * Usage:
 *   pnpm exec tsx scripts/extract-books-metadata.ts
 *   pnpm exec tsx scripts/extract-books-metadata.ts --input public/books/sample --dry-run
 *
 * Common flags:
 *   --input <dir>          Input directory (default: public/books/sample)
 *   --output <file>        JSONL output path (default: public/data/books_metadata.jsonl)
 *   --report <file>        Report output path (default: public/data/books_metadata.report.json)
 *   --max-files <n>        Limit files processed
 *   --concurrency <n>      Parallel workers (default: 4)
 *   --timeout-ms <n>       Timeout for external API requests (default: 9000)
 *   --no-catalog           Disable all external catalog lookups
 *   --no-openlibrary       Disable Open Library lookups
 *   --no-google            Disable Google Books lookups
 *   --openai               Enable OpenAI fallback for needs_review/failed
 *   --openai-model <name>  OpenAI model for fallback (default: gpt-5-mini)
 *   --openai-timeout-ms <n> Timeout for OpenAI fallback requests (default: 180000)
 *   --dry-run              Process and print summary without writing files
 */

import fs from "fs/promises";
import path from "path";
import type { BookMetadataResult } from "../lib/books-metadata/types";
import { extractBookMetadataFromPdf } from "../lib/books-metadata/pipeline";

type CliOptions = {
  inputDir: string;
  outputFile: string;
  reportFile: string;
  maxFiles?: number;
  concurrency: number;
  timeoutMs: number;
  includeCatalog: boolean;
  includeOpenLibrary: boolean;
  includeGoogleBooks: boolean;
  includeOpenAI: boolean;
  openAIModel: string;
  openAITimeoutMs: number;
  dryRun: boolean;
};

type ExecutionReport = {
  generatedAt: string;
  config: CliOptions;
  totalFiles: number;
  processed: number;
  ok: number;
  needsReview: number;
  failed: number;
  averageConfidence: number;
  topReviewCandidates: Array<{
    fileName: string;
    status: BookMetadataResult["status"];
    confidence: number;
    missingFields: string[];
    warnings: string[];
  }>;
};

function printHelp(): void {
  console.log(`
Book metadata extraction pipeline

Usage:
  pnpm exec tsx scripts/extract-books-metadata.ts [flags]

Flags:
  --input <dir>         Input directory (default: public/books/sample)
  --output <file>       JSONL output file (default: public/data/books_metadata.jsonl)
  --report <file>       Report output file (default: public/data/books_metadata.report.json)
  --max-files <n>       Max number of files to process
  --concurrency <n>     Number of parallel workers (default: 4)
  --timeout-ms <n>      Timeout for catalog requests in milliseconds (default: 9000)
  --no-catalog          Disable external catalog enrichment
  --no-openlibrary      Disable Open Library enrichment
  --no-google           Disable Google Books enrichment
  --openai              Enable OpenAI fallback for low-confidence files
  --openai-model <name> OpenAI model for fallback (default: gpt-5-mini)
  --openai-timeout-ms   Timeout for OpenAI requests in milliseconds (default: 180000)
  --dry-run             Do not write output files
  --help                Show this help message
`);
}

function parseCliArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    inputDir: path.join(process.cwd(), "public", "books", "sample"),
    outputFile: path.join(
      process.cwd(),
      "public",
      "data",
      "books_metadata.jsonl",
    ),
    reportFile: path.join(
      process.cwd(),
      "public",
      "data",
      "books_metadata.report.json",
    ),
    concurrency: 4,
    timeoutMs: 9000,
    includeCatalog: true,
    includeOpenLibrary: true,
    includeGoogleBooks: true,
    includeOpenAI: false,
    openAIModel: "gpt-5-mini",
    openAITimeoutMs: 180000,
    dryRun: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === "--help") {
      printHelp();
      process.exit(0);
    } else if (arg === "--input" && argv[i + 1]) {
      options.inputDir = path.resolve(argv[i + 1]);
      i += 1;
    } else if (arg === "--output" && argv[i + 1]) {
      options.outputFile = path.resolve(argv[i + 1]);
      i += 1;
    } else if (arg === "--report" && argv[i + 1]) {
      options.reportFile = path.resolve(argv[i + 1]);
      i += 1;
    } else if (arg === "--max-files" && argv[i + 1]) {
      options.maxFiles = Number(argv[i + 1]);
      i += 1;
    } else if (arg === "--concurrency" && argv[i + 1]) {
      options.concurrency = Math.max(1, Number(argv[i + 1]));
      i += 1;
    } else if (arg === "--timeout-ms" && argv[i + 1]) {
      options.timeoutMs = Math.max(1000, Number(argv[i + 1]));
      i += 1;
    } else if (arg === "--no-catalog") {
      options.includeCatalog = false;
      options.includeOpenLibrary = false;
      options.includeGoogleBooks = false;
    } else if (arg === "--no-openlibrary") {
      options.includeOpenLibrary = false;
    } else if (arg === "--no-google") {
      options.includeGoogleBooks = false;
    } else if (arg === "--openai") {
      options.includeOpenAI = true;
    } else if (arg === "--openai-model" && argv[i + 1]) {
      options.openAIModel = argv[i + 1];
      i += 1;
    } else if (arg === "--openai-timeout-ms" && argv[i + 1]) {
      options.openAITimeoutMs = Math.max(5000, Number(argv[i + 1]));
      i += 1;
    } else if (arg === "--dry-run") {
      options.dryRun = true;
    }
  }

  if (!options.includeOpenLibrary && !options.includeGoogleBooks) {
    options.includeCatalog = false;
  }

  return options;
}

async function loadEnvLocalIfPresent(): Promise<void> {
  const envFile = path.join(process.cwd(), ".env.local");

  try {
    const content = await fs.readFile(envFile, "utf8");
    const lines = content.split(/\r?\n/);

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) {
        continue;
      }

      const separatorIndex = line.indexOf("=");
      if (separatorIndex <= 0) {
        continue;
      }

      const key = line.slice(0, separatorIndex).trim();
      let value = line.slice(separatorIndex + 1).trim();

      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }

      if (key && process.env[key] === undefined) {
        process.env[key] = value;
      }
    }
  } catch {
    // No-op: .env.local is optional for CLI usage.
  }
}

async function collectPdfFiles(rootDir: string): Promise<string[]> {
  const output: string[] = [];

  async function walk(directory: string): Promise<void> {
    const entries = await fs.readdir(directory, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith(".")) {
        continue;
      }

      const fullPath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath);
        continue;
      }

      if (entry.isFile() && entry.name.toLowerCase().endsWith(".pdf")) {
        output.push(fullPath);
      }
    }
  }

  await walk(rootDir);
  output.sort((a, b) => a.localeCompare(b));
  return output;
}

async function runWithConcurrency<T, U>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<U>,
): Promise<U[]> {
  const results: U[] = new Array(items.length);
  let nextIndex = 0;

  async function consume(): Promise<void> {
    while (true) {
      const current = nextIndex;
      nextIndex += 1;

      if (current >= items.length) {
        return;
      }

      results[current] = await worker(items[current], current);
    }
  }

  const workers = Array.from({ length: Math.min(limit, items.length) }, () =>
    consume(),
  );
  await Promise.all(workers);
  return results;
}

async function processPdfFile(
  filePath: string,
  options: CliOptions,
): Promise<BookMetadataResult> {
  const fileName = path.basename(filePath);
  const fileBuffer = await fs.readFile(filePath);

  return extractBookMetadataFromPdf({
    fileName,
    fileBuffer,
    filePath,
    options: {
      includeCatalog: options.includeCatalog,
      includeOpenLibrary: options.includeOpenLibrary,
      includeGoogleBooks: options.includeGoogleBooks,
      timeoutMs: options.timeoutMs,
      includeOpenAI: options.includeOpenAI,
      openAIModel: options.openAIModel,
      openAITimeoutMs: options.openAITimeoutMs,
      googleBooksApiKey: process.env.GOOGLE_BOOKS_API_KEY,
    },
  });
}

function buildReport(
  results: BookMetadataResult[],
  config: CliOptions,
): ExecutionReport {
  const ok = results.filter((item) => item.status === "ok").length;
  const needsReview = results.filter(
    (item) => item.status === "needs_review",
  ).length;
  const failed = results.filter((item) => item.status === "failed").length;
  const averageConfidence =
    results.length > 0
      ? results.reduce((sum, item) => sum + item.confidence, 0) / results.length
      : 0;

  const topReviewCandidates = results
    .filter((item) => item.status !== "ok")
    .sort((a, b) => a.confidence - b.confidence)
    .slice(0, 10)
    .map((item) => ({
      fileName: item.fileName,
      status: item.status,
      confidence: item.confidence,
      missingFields: item.missingFields,
      warnings: item.diagnostics.warnings,
    }));

  return {
    generatedAt: new Date().toISOString(),
    config,
    totalFiles: results.length,
    processed: results.length,
    ok,
    needsReview,
    failed,
    averageConfidence,
    topReviewCandidates,
  };
}

async function writeOutputs(
  results: BookMetadataResult[],
  report: ExecutionReport,
  options: CliOptions,
): Promise<void> {
  await fs.mkdir(path.dirname(options.outputFile), { recursive: true });
  await fs.mkdir(path.dirname(options.reportFile), { recursive: true });

  const jsonl = results.map((item) => JSON.stringify(item)).join("\n");
  await fs.writeFile(options.outputFile, jsonl, "utf8");
  await fs.writeFile(
    options.reportFile,
    JSON.stringify(report, null, 2),
    "utf8",
  );
}

async function main(): Promise<void> {
  await loadEnvLocalIfPresent();
  const options = parseCliArgs(process.argv.slice(2));
  console.log("Starting book metadata extraction...");
  console.log(`Input: ${options.inputDir}`);
  console.log(
    `Catalog enrichment: ${options.includeCatalog ? "enabled" : "disabled"}`,
  );
  console.log(
    `OpenAI fallback: ${options.includeOpenAI ? "enabled" : "disabled"}`,
  );

  const allFiles = await collectPdfFiles(options.inputDir);
  const files =
    typeof options.maxFiles === "number" && Number.isFinite(options.maxFiles)
      ? allFiles.slice(0, options.maxFiles)
      : allFiles;

  if (files.length === 0) {
    console.log("No PDF files found.");
    return;
  }

  console.log(`Found ${files.length} PDF files.`);
  const startedAt = Date.now();

  const results = await runWithConcurrency(
    files,
    options.concurrency,
    async (filePath, index) => {
      console.log(
        `Processing [${index + 1}/${files.length}]: ${path.basename(filePath)}`,
      );
      try {
        return await processPdfFile(filePath, options);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        return {
          filePath,
          fileName: path.basename(filePath),
          fileSizeBytes: 0,
          status: "failed",
          confidence: 0,
          metadata: {},
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
            warnings: [`Pipeline failure: ${message}`],
          },
        } satisfies BookMetadataResult;
      }
    },
  );

  const report = buildReport(results, options);
  const elapsedMs = Date.now() - startedAt;

  if (!options.dryRun) {
    await writeOutputs(results, report, options);
    console.log(`JSONL output: ${options.outputFile}`);
    console.log(`Report output: ${options.reportFile}`);
  }

  console.log("");
  console.log("Summary:");
  console.log(`- Processed: ${report.processed}`);
  console.log(`- OK: ${report.ok}`);
  console.log(`- Needs review: ${report.needsReview}`);
  console.log(`- Failed: ${report.failed}`);
  console.log(`- Average confidence: ${report.averageConfidence.toFixed(2)}`);
  console.log(`- Elapsed: ${(elapsedMs / 1000).toFixed(2)}s`);
}

main().catch((error) => {
  console.error("Unhandled pipeline error:", error);
  process.exit(1);
});
