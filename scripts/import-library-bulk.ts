/**
 * Bulk import a filesystem library into Convex library storage.
 *
 * This script is intentionally split into two phases:
 * 1. prepare: scan folders and extract metadata into a manifest
 * 2. ingest: create collections, upload PDFs, and create library books
 * 3. repair: re-extract metadata and update existing books in place
 *
 * Usage examples:
 *   pnpm exec tsx scripts/import-library-bulk.ts prepare --input "public/books/sample"
 *   pnpm exec tsx scripts/import-library-bulk.ts ingest --clerk-id user_123
 *   pnpm exec tsx scripts/import-library-bulk.ts all --input "public/books/sample" --clerk-id user_123
 */

import fs from "fs/promises";
import path from "path";
import { ConvexHttpClient } from "convex/browser";
import type { Id } from "../convex/_generated/dataModel";
import { api } from "../convex/_generated/api";
import { extractBookMetadataWithFallback } from "../lib/books-metadata/service";
import {
  buildCreateLibraryBookPayload,
  buildUpdateLibraryBookPayload,
  createFallbackExtractionFromFile,
  createFormStateFromExtraction,
  createLibraryExtractionResponse,
  type LibraryExtractionResponse,
} from "../lib/library/import";

type AdminConvexHttpClient = ConvexHttpClient & {
  setAdminAuth: (
    token: string,
    actingAsIdentity?: {
      subject: string;
      issuer: string;
      name?: string;
      email?: string;
      emailVerified?: boolean;
    },
  ) => void;
};

type Command = "prepare" | "ingest" | "repair" | "all";

type CliOptions = {
  command: Command;
  inputDir: string;
  libraryRootDir: string;
  stateDir: string;
  manifestFile: string;
  ingestStateFile: string;
  repairStateFile: string;
  maxFiles?: number;
  metadataConcurrency: number;
  includeOpenAI: boolean;
  openAIModel: string;
  openAITimeoutMs: number;
  timeoutMs: number;
  includeCatalog: boolean;
  includeOpenLibrary: boolean;
  includeGoogleBooks: boolean;
  clerkId?: string;
  convexUrl?: string;
  convexDeployKey?: string;
  identityIssuer: string;
  failFast: boolean;
  verbose: boolean;
};

type ScannedLibrary = {
  directories: string[];
  skippedFiles: string[];
  pdfFiles: Array<{
    absolutePath: string;
    relativePath: string;
    directoryPath: string;
    fileName: string;
    fileSizeBytes: number;
  }>;
};

type BulkImportManifestItem = {
  relativePath: string;
  directoryPath: string;
  fileName: string;
  fileSizeBytes: number;
  extraction: LibraryExtractionResponse;
};

type BulkImportManifest = {
  version: 2;
  generatedAt: string;
  inputDir: string;
  libraryRootDir: string;
  directories: string[];
  skippedFiles: string[];
  items: BulkImportManifestItem[];
};

type BulkImportItemState = {
  stage: "pending" | "uploaded" | "created" | "failed";
  attempts: number;
  storageId?: string;
  bookId?: string;
  lastError?: string;
  updatedAt: string;
};

type BulkImportIngestState = {
  version: 1;
  updatedAt: string;
  collectionsByPath: Record<string, string>;
  items: Record<string, BulkImportItemState>;
};

type BulkImportRepairItemState = {
  stage: "pending" | "updated" | "failed" | "skipped";
  attempts: number;
  lastError?: string;
  updatedAt: string;
};

type BulkImportRepairState = {
  version: 1;
  updatedAt: string;
  items: Record<string, BulkImportRepairItemState>;
};

function printHelp(): void {
  console.log(`
Bulk library import

Usage:
  pnpm exec tsx scripts/import-library-bulk.ts <prepare|ingest|repair|all> [flags]

Core flags:
  --input <dir>              Input directory (default: public/books/Biblioteca Alef)
  --library-root <dir>       Logical library root for collection nesting (default: nearest parent named Biblioteca Alef, else --input)
  --state-dir <dir>          Directory for manifest/progress files (default: .tmp/library-import)
  --manifest <file>          Manifest JSON path (default: <state-dir>/manifest.json)
  --progress <file>          Ingest progress JSON path (default: <state-dir>/ingest-state.json)
  --repair-progress <file>   Repair progress JSON path (default: <state-dir>/repair-state.json)
  --max-files <n>            Limit number of PDFs processed
  --verbose                  Print per-file progress
  --fail-fast                Stop on first ingestion error

Prepare flags:
  --metadata-concurrency <n> Parallel metadata workers (default: 2)
  --no-openai                Disable OpenAI fallback
  --openai-model <name>      OpenAI model (default: gpt-5-mini)
  --openai-timeout-ms <n>    OpenAI timeout (default: 180000)
  --timeout-ms <n>           Catalog timeout (default: 9000)
  --no-catalog               Disable all catalog enrichment
  --no-openlibrary           Disable Open Library enrichment
  --no-google                Disable Google Books enrichment

Ingest flags:
  --clerk-id <id>            Clerk user id of an admin to attribute creations
  --convex-url <url>         Convex deployment URL (default: NEXT_PUBLIC_CONVEX_URL or CONVEX_URL)
  --convex-deploy-key <key>  Convex deploy/admin key (default: CONVEX_DEPLOY_KEY)
  --identity-issuer <url>    Synthetic issuer for acting identity (default: https://clerk.local)

Repair flags:
  Reuses manifest + ingest-state and updates metadata in place without re-uploading PDFs
`);
}

function parseCliArgs(argv: string[]): CliOptions {
  const stateDir = path.join(process.cwd(), ".tmp", "library-import");
  const defaultLibraryRoot = path.join(
    process.cwd(),
    "public",
    "books",
    "Biblioteca Alef",
  );
  const options: CliOptions = {
    command: "all",
    inputDir: defaultLibraryRoot,
    libraryRootDir: defaultLibraryRoot,
    stateDir,
    manifestFile: path.join(stateDir, "manifest.json"),
    ingestStateFile: path.join(stateDir, "ingest-state.json"),
    repairStateFile: path.join(stateDir, "repair-state.json"),
    metadataConcurrency: 2,
    includeOpenAI: true,
    openAIModel: "gpt-5-mini",
    openAITimeoutMs: 180000,
    timeoutMs: 9000,
    includeCatalog: true,
    includeOpenLibrary: true,
    includeGoogleBooks: true,
    convexUrl: process.env.CONVEX_URL ?? process.env.NEXT_PUBLIC_CONVEX_URL,
    convexDeployKey: process.env.CONVEX_DEPLOY_KEY,
    identityIssuer: "https://clerk.local",
    failFast: false,
    verbose: false,
  };

  const commandArg = argv[0];
  if (
    commandArg === "prepare" ||
    commandArg === "ingest" ||
    commandArg === "repair" ||
    commandArg === "all"
  ) {
    options.command = commandArg;
    argv = argv.slice(1);
  } else if (commandArg === "--help" || commandArg === "-h") {
    printHelp();
    process.exit(0);
  }

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    } else if (arg === "--input" && next) {
      options.inputDir = path.resolve(next);
      index += 1;
    } else if (arg === "--library-root" && next) {
      options.libraryRootDir = path.resolve(next);
      index += 1;
    } else if (arg === "--state-dir" && next) {
      options.stateDir = path.resolve(next);
      options.manifestFile = path.join(options.stateDir, "manifest.json");
      options.ingestStateFile = path.join(
        options.stateDir,
        "ingest-state.json",
      );
      options.repairStateFile = path.join(
        options.stateDir,
        "repair-state.json",
      );
      index += 1;
    } else if (arg === "--manifest" && next) {
      options.manifestFile = path.resolve(next);
      index += 1;
    } else if (arg === "--progress" && next) {
      options.ingestStateFile = path.resolve(next);
      index += 1;
    } else if (arg === "--repair-progress" && next) {
      options.repairStateFile = path.resolve(next);
      index += 1;
    } else if (arg === "--max-files" && next) {
      options.maxFiles = Math.max(1, Number.parseInt(next, 10));
      index += 1;
    } else if (arg === "--metadata-concurrency" && next) {
      options.metadataConcurrency = Math.max(1, Number.parseInt(next, 10));
      index += 1;
    } else if (arg === "--no-openai") {
      options.includeOpenAI = false;
    } else if (arg === "--openai-model" && next) {
      options.openAIModel = next;
      index += 1;
    } else if (arg === "--openai-timeout-ms" && next) {
      options.openAITimeoutMs = Math.max(5000, Number.parseInt(next, 10));
      index += 1;
    } else if (arg === "--timeout-ms" && next) {
      options.timeoutMs = Math.max(1000, Number.parseInt(next, 10));
      index += 1;
    } else if (arg === "--no-catalog") {
      options.includeCatalog = false;
      options.includeOpenLibrary = false;
      options.includeGoogleBooks = false;
    } else if (arg === "--no-openlibrary") {
      options.includeOpenLibrary = false;
    } else if (arg === "--no-google") {
      options.includeGoogleBooks = false;
    } else if (arg === "--clerk-id" && next) {
      options.clerkId = next;
      index += 1;
    } else if (arg === "--convex-url" && next) {
      options.convexUrl = next;
      index += 1;
    } else if (arg === "--convex-deploy-key" && next) {
      options.convexDeployKey = next;
      index += 1;
    } else if (arg === "--identity-issuer" && next) {
      options.identityIssuer = next;
      index += 1;
    } else if (arg === "--fail-fast") {
      options.failFast = true;
    } else if (arg === "--verbose") {
      options.verbose = true;
    }
  }

  if (!options.includeOpenLibrary && !options.includeGoogleBooks) {
    options.includeCatalog = false;
  }

  if (
    path.resolve(options.libraryRootDir) === path.resolve(defaultLibraryRoot) &&
    !path.resolve(options.inputDir).startsWith(path.resolve(defaultLibraryRoot))
  ) {
    options.libraryRootDir = detectLibraryRootDir(options.inputDir);
  }

  if (!options.libraryRootDir) {
    options.libraryRootDir = detectLibraryRootDir(options.inputDir);
  }

  if (
    !path
      .resolve(options.inputDir)
      .startsWith(path.resolve(options.libraryRootDir))
  ) {
    throw new Error("--input must be inside --library-root");
  }

  return options;
}

async function loadEnvLocalIfPresent(): Promise<void> {
  const envFile = path.join(process.cwd(), ".env.local");

  try {
    const content = await fs.readFile(envFile, "utf8");
    for (const rawLine of content.split(/\r?\n/)) {
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
    // .env.local is optional when running the script.
  }
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return "Unknown error";
}

function toPosixRelative(rootDir: string, targetPath: string): string {
  const relativePath = path.relative(rootDir, targetPath);
  return relativePath.split(path.sep).join("/");
}

function detectLibraryRootDir(inputDir: string): string {
  let current = path.resolve(inputDir);

  while (true) {
    if (path.basename(current) === "Biblioteca Alef") {
      return current;
    }

    const parent = path.dirname(current);
    if (parent === current) {
      return path.resolve(inputDir);
    }

    current = parent;
  }
}

function expandDirectoryAncestors(directoryPaths: string[]): string[] {
  const expanded = new Set<string>();

  for (const directoryPath of directoryPaths) {
    let current = directoryPath;

    while (current && current !== ".") {
      expanded.add(current);
      const parent = path.posix.dirname(current);
      current = parent === "." ? "" : parent;
    }
  }

  return Array.from(expanded).sort((left, right) => left.localeCompare(right));
}

async function scanLibrary(
  inputDir: string,
  libraryRootDir: string,
): Promise<ScannedLibrary> {
  const directories = new Set<string>();
  const skippedFiles: string[] = [];
  const pdfFiles: ScannedLibrary["pdfFiles"] = [];

  async function walk(directory: string): Promise<void> {
    const entries = await fs.readdir(directory, { withFileTypes: true });
    entries.sort((left, right) => left.name.localeCompare(right.name));

    for (const entry of entries) {
      if (entry.name.startsWith(".")) {
        continue;
      }

      const fullPath = path.join(directory, entry.name);
      const relativePath = toPosixRelative(libraryRootDir, fullPath);

      if (entry.isDirectory()) {
        directories.add(relativePath);
        await walk(fullPath);
        continue;
      }

      if (!entry.isFile()) {
        continue;
      }

      if (!entry.name.toLowerCase().endsWith(".pdf")) {
        skippedFiles.push(relativePath);
        continue;
      }

      const stats = await fs.stat(fullPath);
      pdfFiles.push({
        absolutePath: fullPath,
        relativePath,
        directoryPath:
          path.posix.dirname(relativePath) === "."
            ? ""
            : path.posix.dirname(relativePath),
        fileName: entry.name,
        fileSizeBytes: stats.size,
      });
    }
  }

  const inputRelativePath = toPosixRelative(libraryRootDir, inputDir);
  if (inputRelativePath && inputRelativePath !== ".") {
    directories.add(inputRelativePath);
  }

  await walk(inputDir);

  return {
    directories: expandDirectoryAncestors(Array.from(directories)),
    skippedFiles: skippedFiles.sort((left, right) => left.localeCompare(right)),
    pdfFiles: pdfFiles.sort((left, right) =>
      left.relativePath.localeCompare(right.relativePath),
    ),
  };
}

async function readJsonFile<T>(filePath: string): Promise<T | null> {
  try {
    const content = await fs.readFile(filePath, "utf8");
    return JSON.parse(content) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }

    throw error;
  }
}

async function writeJsonFile(filePath: string, value: unknown): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function runWithConcurrency<T>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<void>,
): Promise<void> {
  let nextIndex = 0;

  async function consume() {
    while (true) {
      const currentIndex = nextIndex;
      nextIndex += 1;

      if (currentIndex >= items.length) {
        return;
      }

      await worker(items[currentIndex], currentIndex);
    }
  }

  const workers = Array.from(
    { length: Math.min(limit, Math.max(1, items.length)) },
    () => consume(),
  );
  await Promise.all(workers);
}

function limitItems<T>(items: T[], maxItems?: number): T[] {
  if (!maxItems || maxItems >= items.length) {
    return items;
  }

  return items.slice(0, maxItems);
}

async function prepareManifest(
  options: CliOptions,
): Promise<BulkImportManifest> {
  const scanned = await scanLibrary(options.inputDir, options.libraryRootDir);
  const selectedPdfFiles = limitItems(scanned.pdfFiles, options.maxFiles);
  const existingManifest = await readJsonFile<BulkImportManifest>(
    options.manifestFile,
  );

  if (existingManifest && !existingManifest.libraryRootDir) {
    throw new Error(
      `Manifest at ${options.manifestFile} is from an older importer format. Remove it or use a new --state-dir.`,
    );
  }

  if (
    existingManifest &&
    (path.resolve(existingManifest.inputDir) !==
      path.resolve(options.inputDir) ||
      path.resolve(existingManifest.libraryRootDir) !==
        path.resolve(options.libraryRootDir))
  ) {
    throw new Error(
      `Manifest at ${options.manifestFile} was created for input ${existingManifest.inputDir} and library root ${existingManifest.libraryRootDir}. Use a different --state-dir/--manifest or remove the existing manifest.`,
    );
  }

  const existingEntries = new Map(
    (existingManifest?.items ?? []).map((item) => [item.relativePath, item]),
  );

  const manifestItems = new Map(existingEntries);
  const pendingFiles = selectedPdfFiles.filter(
    (file) => !manifestItems.has(file.relativePath),
  );

  let writeQueue = Promise.resolve();
  const queueManifestWrite = async () => {
    writeQueue = writeQueue.then(async () => {
      const manifest: BulkImportManifest = {
        version: 2,
        generatedAt: new Date().toISOString(),
        inputDir: options.inputDir,
        libraryRootDir: options.libraryRootDir,
        directories: scanned.directories,
        skippedFiles: scanned.skippedFiles,
        items: Array.from(manifestItems.values()).sort((left, right) =>
          left.relativePath.localeCompare(right.relativePath),
        ),
      };
      await writeJsonFile(options.manifestFile, manifest);
    });

    await writeQueue;
  };

  await queueManifestWrite();

  if (pendingFiles.length === 0) {
    const manifest = await readJsonFile<BulkImportManifest>(
      options.manifestFile,
    );
    if (!manifest) {
      throw new Error("Manifest could not be created");
    }

    return manifest;
  }

  console.log(
    `[library-import] prepare: extracting metadata for ${pendingFiles.length} PDF(s)`,
  );

  await runWithConcurrency(
    pendingFiles,
    options.metadataConcurrency,
    async (file, index) => {
      if (options.verbose) {
        console.log(
          `[library-import] prepare ${index + 1}/${pendingFiles.length}: ${file.relativePath}`,
        );
      }

      let extraction: LibraryExtractionResponse;

      try {
        const fileBuffer = await fs.readFile(file.absolutePath);
        const result = await extractBookMetadataWithFallback({
          fileName: file.fileName,
          filePath: file.relativePath,
          fileBuffer,
          includeCatalog: options.includeCatalog,
          includeOpenLibrary: options.includeOpenLibrary,
          includeGoogleBooks: options.includeGoogleBooks,
          timeoutMs: options.timeoutMs,
          includeOpenAI: options.includeOpenAI,
          openAIModel: options.openAIModel,
          openAITimeoutMs: options.openAITimeoutMs,
          googleBooksApiKey: process.env.GOOGLE_BOOKS_API_KEY,
        });

        extraction = createLibraryExtractionResponse(result);
      } catch (error) {
        const fallbackExtraction = createFallbackExtractionFromFile(
          file.fileName,
        );
        fallbackExtraction.warnings = [
          `Metadata extraction failed: ${getErrorMessage(error)}`,
        ];
        extraction = fallbackExtraction;
      }

      manifestItems.set(file.relativePath, {
        relativePath: file.relativePath,
        directoryPath: file.directoryPath,
        fileName: file.fileName,
        fileSizeBytes: file.fileSizeBytes,
        extraction,
      });

      await queueManifestWrite();
    },
  );

  const manifest = await readJsonFile<BulkImportManifest>(options.manifestFile);
  if (!manifest) {
    throw new Error("Manifest could not be loaded after prepare");
  }

  console.log(
    `[library-import] prepare: manifest ready at ${options.manifestFile}`,
  );

  return manifest;
}

function createConvexClient(options: CliOptions): ConvexHttpClient {
  const convexUrl =
    options.convexUrl ??
    process.env.CONVEX_URL ??
    process.env.NEXT_PUBLIC_CONVEX_URL;
  const convexDeployKey =
    options.convexDeployKey ?? process.env.CONVEX_DEPLOY_KEY;

  if (!convexUrl) {
    throw new Error(
      "Missing Convex URL. Set --convex-url or NEXT_PUBLIC_CONVEX_URL",
    );
  }

  if (!convexDeployKey) {
    throw new Error(
      "Missing Convex deploy key. Set --convex-deploy-key or CONVEX_DEPLOY_KEY",
    );
  }

  const client = new ConvexHttpClient(convexUrl) as AdminConvexHttpClient;
  client.setAdminAuth(convexDeployKey);
  return client;
}

async function configureAdminIdentity(
  client: ConvexHttpClient,
  options: CliOptions,
): Promise<void> {
  if (!options.clerkId) {
    throw new Error("Missing --clerk-id for ingest");
  }

  const actor = await client.query(api.users.getUserByClerkId, {
    clerkId: options.clerkId,
  });

  if (!actor) {
    throw new Error(`No user found for Clerk id ${options.clerkId}`);
  }

  if (actor.role !== "admin" && actor.role !== "superadmin") {
    throw new Error(`User ${options.clerkId} is not an admin`);
  }

  (client as AdminConvexHttpClient).setAdminAuth(
    options.convexDeployKey ?? process.env.CONVEX_DEPLOY_KEY!,
    {
      subject: actor.clerkId,
      issuer: options.identityIssuer,
      name:
        [actor.firstName, actor.lastName].filter(Boolean).join(" ") ||
        actor.email,
      email: actor.email,
      emailVerified: true,
    },
  );
}

async function loadOrCreateIngestState(
  options: CliOptions,
  manifest: BulkImportManifest,
): Promise<BulkImportIngestState> {
  const existingState = await readJsonFile<BulkImportIngestState>(
    options.ingestStateFile,
  );

  if (existingState) {
    let changed = false;

    for (const item of manifest.items) {
      if (existingState.items[item.relativePath]) {
        continue;
      }

      existingState.items[item.relativePath] = {
        stage: "pending",
        attempts: 0,
        updatedAt: new Date().toISOString(),
      };
      changed = true;
    }

    if (changed) {
      existingState.updatedAt = new Date().toISOString();
      await writeJsonFile(options.ingestStateFile, existingState);
    }

    return existingState;
  }

  const nextState: BulkImportIngestState = {
    version: 1,
    updatedAt: new Date().toISOString(),
    collectionsByPath: {},
    items: Object.fromEntries(
      manifest.items.map((item) => [
        item.relativePath,
        {
          stage: "pending",
          attempts: 0,
          updatedAt: new Date().toISOString(),
        },
      ]),
    ),
  };

  await writeJsonFile(options.ingestStateFile, nextState);
  return nextState;
}

async function loadOrCreateRepairState(
  options: CliOptions,
  manifest: BulkImportManifest,
): Promise<BulkImportRepairState> {
  const existingState = await readJsonFile<BulkImportRepairState>(
    options.repairStateFile,
  );

  if (existingState?.version === 1) {
    let changed = false;

    for (const item of manifest.items) {
      if (existingState.items[item.relativePath]) {
        continue;
      }

      existingState.items[item.relativePath] = {
        stage: "pending",
        attempts: 0,
        updatedAt: new Date().toISOString(),
      };
      changed = true;
    }

    if (changed) {
      existingState.updatedAt = new Date().toISOString();
      await writeJsonFile(options.repairStateFile, existingState);
    }

    return existingState;
  }

  const nextState: BulkImportRepairState = {
    version: 1,
    updatedAt: new Date().toISOString(),
    items: Object.fromEntries(
      manifest.items.map((item) => [
        item.relativePath,
        {
          stage: "pending",
          attempts: 0,
          updatedAt: new Date().toISOString(),
        },
      ]),
    ),
  };

  await writeJsonFile(options.repairStateFile, nextState);
  return nextState;
}

async function ensureCollections(
  client: ConvexHttpClient,
  options: CliOptions,
  manifest: BulkImportManifest,
  state: BulkImportIngestState,
): Promise<void> {
  const tree = await client.query(api.library.getLibraryCollectionsTree, {});
  const collectionPathById = new Map<string, string>();

  for (const node of tree) {
    const parentPath = node.parentId
      ? (collectionPathById.get(node.parentId) ?? "")
      : "";
    const nextPath = parentPath ? `${parentPath}/${node.name}` : node.name;
    collectionPathById.set(node.id, nextPath);
    state.collectionsByPath[nextPath] = node.id;
  }

  for (const directoryPath of manifest.directories) {
    if (!directoryPath || state.collectionsByPath[directoryPath]) {
      continue;
    }

    const parentPath = path.posix.dirname(directoryPath);
    const resolvedParentPath = parentPath === "." ? "" : parentPath;
    const parentId = resolvedParentPath
      ? (state.collectionsByPath[resolvedParentPath] as
          | Id<"library_collections">
          | undefined)
      : undefined;
    const name = path.posix.basename(directoryPath);

    const collectionId = await client.mutation(
      api.library.createLibraryCollection,
      {
        name,
        parentId,
      },
    );
    state.collectionsByPath[directoryPath] = collectionId;
    state.updatedAt = new Date().toISOString();
    await writeJsonFile(options.ingestStateFile, state);

    if (options.verbose) {
      console.log(`[library-import] created collection: ${directoryPath}`);
    }
  }
}

function validateManifestCompatibility(
  manifest: BulkImportManifest,
  options: CliOptions,
): void {
  if (!manifest.libraryRootDir) {
    throw new Error(
      `Manifest at ${options.manifestFile} is from an older importer format. Run prepare again with a fresh state directory.`,
    );
  }

  if (
    path.resolve(manifest.inputDir) !== path.resolve(options.inputDir) ||
    path.resolve(manifest.libraryRootDir) !==
      path.resolve(options.libraryRootDir)
  ) {
    throw new Error(
      `Manifest input dir/root ${manifest.inputDir} / ${manifest.libraryRootDir} do not match current --input/--library-root ${options.inputDir} / ${options.libraryRootDir}. Use the manifest with its original paths or create a new state directory.`,
    );
  }
}

function hasOpenAIFailureWarnings(warnings: string[]): boolean {
  return warnings.some(
    (warning) =>
      warning.startsWith("OpenAI request failed:") ||
      warning.startsWith("OpenAI stage failed and was skipped:"),
  );
}

function buildUploadUrlResponsePayload(value: unknown): string {
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }

  throw new Error("Convex did not return a valid upload URL");
}

async function uploadPdfFile(args: {
  client: ConvexHttpClient;
  absolutePath: string;
  verbose: boolean;
}): Promise<Id<"_storage">> {
  const uploadUrl = buildUploadUrlResponsePayload(
    await args.client.mutation(api.library.generateLibraryBookUploadUrl, {}),
  );
  const fileBuffer = await fs.readFile(args.absolutePath);
  const response = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/pdf",
    },
    body: new Uint8Array(fileBuffer),
  });

  if (!response.ok) {
    throw new Error(
      `Upload failed with HTTP ${response.status}: ${await response.text()}`,
    );
  }

  const payload = (await response.json()) as { storageId?: string };
  if (!payload.storageId) {
    throw new Error("Upload response did not include storageId");
  }

  if (args.verbose) {
    console.log(`[library-import] uploaded ${args.absolutePath}`);
  }

  return payload.storageId as Id<"_storage">;
}

async function ingestManifest(options: CliOptions): Promise<void> {
  const manifest = await readJsonFile<BulkImportManifest>(options.manifestFile);
  if (!manifest) {
    throw new Error(
      `Manifest not found at ${options.manifestFile}. Run prepare first.`,
    );
  }

  if (!manifest.libraryRootDir) {
    throw new Error(
      `Manifest at ${options.manifestFile} is from an older importer format. Run prepare again with a fresh state directory.`,
    );
  }

  if (
    path.resolve(manifest.inputDir) !== path.resolve(options.inputDir) ||
    path.resolve(manifest.libraryRootDir) !==
      path.resolve(options.libraryRootDir)
  ) {
    throw new Error(
      `Manifest input dir/root ${manifest.inputDir} / ${manifest.libraryRootDir} do not match current --input/--library-root ${options.inputDir} / ${options.libraryRootDir}. Use the manifest with its original paths or create a new state directory.`,
    );
  }

  const state = await loadOrCreateIngestState(options, manifest);
  const client = createConvexClient(options);
  await configureAdminIdentity(client, options);
  await ensureCollections(client, options, manifest, state);

  const items = manifest.items;
  console.log(`[library-import] ingest: processing ${items.length} item(s)`);

  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    const itemState = state.items[item.relativePath] ?? {
      stage: "pending",
      attempts: 0,
      updatedAt: new Date().toISOString(),
    };

    if (itemState.stage === "created") {
      continue;
    }

    const absolutePath = path.join(
      manifest.libraryRootDir,
      ...item.relativePath.split("/"),
    );
    const leafCollectionId = item.directoryPath
      ? (state.collectionsByPath[item.directoryPath] as
          | Id<"library_collections">
          | undefined)
      : undefined;

    if (options.verbose) {
      console.log(
        `[library-import] ingest ${index + 1}/${items.length}: ${item.relativePath}`,
      );
    }

    let storageId = itemState.storageId as Id<"_storage"> | undefined;

    try {
      if (!storageId) {
        storageId = await uploadPdfFile({
          client,
          absolutePath,
          verbose: options.verbose,
        });
        state.items[item.relativePath] = {
          stage: "uploaded",
          attempts: itemState.attempts,
          storageId,
          updatedAt: new Date().toISOString(),
        };
        state.updatedAt = new Date().toISOString();
        await writeJsonFile(options.ingestStateFile, state);
      }

      const formState = createFormStateFromExtraction({
        extraction: item.extraction,
        fileName: item.fileName,
      });
      formState.collectionIds = leafCollectionId ? [leafCollectionId] : [];

      const payload = buildCreateLibraryBookPayload({
        formState,
        fileName: item.fileName,
        fileSizeBytes: item.fileSizeBytes,
        storageId,
      });

      const bookId = await client.mutation(api.library.createLibraryBook, {
        ...payload,
        storageId: payload.storageId as Id<"_storage">,
        collectionIds: payload.collectionIds as Id<"library_collections">[],
      });

      state.items[item.relativePath] = {
        stage: "created",
        attempts: itemState.attempts + 1,
        storageId,
        bookId,
        updatedAt: new Date().toISOString(),
      };
      state.updatedAt = new Date().toISOString();
      await writeJsonFile(options.ingestStateFile, state);
    } catch (error) {
      const message = getErrorMessage(error);

      if (storageId) {
        try {
          await client.mutation(api.library.deleteUnusedLibraryUpload, {
            storageId,
          });
        } catch (cleanupError) {
          console.error(
            `[library-import] cleanup failed for ${item.relativePath}: ${getErrorMessage(cleanupError)}`,
          );
        }
      }

      state.items[item.relativePath] = {
        stage: "failed",
        attempts: itemState.attempts + 1,
        lastError: message,
        updatedAt: new Date().toISOString(),
      };
      state.updatedAt = new Date().toISOString();
      await writeJsonFile(options.ingestStateFile, state);
      console.error(`[library-import] failed ${item.relativePath}: ${message}`);

      if (options.failFast) {
        throw error;
      }
    }
  }

  console.log(
    `[library-import] ingest: progress saved at ${options.ingestStateFile}`,
  );
}

async function repairManifest(options: CliOptions): Promise<void> {
  const manifest = await readJsonFile<BulkImportManifest>(options.manifestFile);
  if (!manifest) {
    throw new Error(
      `Manifest not found at ${options.manifestFile}. Run prepare first.`,
    );
  }

  validateManifestCompatibility(manifest, options);

  const ingestState = await readJsonFile<BulkImportIngestState>(
    options.ingestStateFile,
  );
  if (!ingestState) {
    throw new Error(
      `Ingest state not found at ${options.ingestStateFile}. Run ingest first.`,
    );
  }

  const repairState = await loadOrCreateRepairState(options, manifest);
  const client = createConvexClient(options);
  await configureAdminIdentity(client, options);

  const createdItems = manifest.items.filter((item) => {
    const ingestItem = ingestState.items[item.relativePath];
    return ingestItem?.stage === "created" && Boolean(ingestItem.bookId);
  });
  const items =
    options.maxFiles && options.maxFiles > 0
      ? createdItems.slice(0, options.maxFiles)
      : createdItems;

  console.log(`[library-import] repair: processing ${items.length} item(s)`);

  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    const ingestItem = ingestState.items[item.relativePath];
    const repairItem = repairState.items[item.relativePath] ?? {
      stage: "pending",
      attempts: 0,
      updatedAt: new Date().toISOString(),
    };

    if (repairItem.stage === "updated") {
      continue;
    }

    const bookId = ingestItem?.bookId as Id<"library_books"> | undefined;
    if (!bookId) {
      repairState.items[item.relativePath] = {
        stage: "skipped",
        attempts: repairItem.attempts,
        lastError: "Book was not created during ingest",
        updatedAt: new Date().toISOString(),
      };
      repairState.updatedAt = new Date().toISOString();
      await writeJsonFile(options.repairStateFile, repairState);
      continue;
    }

    const absolutePath = path.join(
      manifest.libraryRootDir,
      ...item.relativePath.split("/"),
    );

    if (options.verbose) {
      console.log(
        `[library-import] repair ${index + 1}/${items.length}: ${item.relativePath}`,
      );
    }

    try {
      const existingBook = await client.query(api.library.getLibraryBookById, {
        id: bookId,
      });

      if (!existingBook) {
        throw new Error(`Book ${bookId} no longer exists in Convex`);
      }

      const fileBuffer = await fs.readFile(absolutePath);
      const result = await extractBookMetadataWithFallback({
        fileBuffer,
        fileName: item.fileName,
        includeCatalog: options.includeCatalog,
        includeOpenAI: options.includeOpenAI,
        includeGoogleBooks: options.includeGoogleBooks,
        includeOpenLibrary: options.includeOpenLibrary,
        timeoutMs: options.timeoutMs,
        openAIModel: options.openAIModel,
        openAITimeoutMs: options.openAITimeoutMs,
      });
      const extraction = createLibraryExtractionResponse(result);

      if (
        options.includeOpenAI &&
        hasOpenAIFailureWarnings(extraction.warnings)
      ) {
        throw new Error(
          extraction.warnings.find((warning) =>
            warning.startsWith("OpenAI request failed:"),
          ) ??
            extraction.warnings.find((warning) =>
              warning.startsWith("OpenAI stage failed and was skipped:"),
            ) ??
            "OpenAI failed during repair",
        );
      }

      const formState = createFormStateFromExtraction({
        extraction,
        fileName: item.fileName,
      });
      formState.collectionIds = existingBook.collectionIds;

      const payload = buildUpdateLibraryBookPayload({
        bookId,
        formState,
      });

      const updateArgs: {
        bookId: Id<"library_books">;
        status?: "failed" | "ok" | "needs_review";
        metadata: typeof payload.metadata;
        extractionWarnings?: string[];
        collectionIds?: Id<"library_collections">[];
      } = {
        bookId,
        status: payload.status,
        metadata: payload.metadata,
        extractionWarnings: payload.extractionWarnings,
        collectionIds: payload.collectionIds as Id<"library_collections">[],
      };

      await client.mutation(api.library.updateLibraryBook, updateArgs);

      repairState.items[item.relativePath] = {
        stage: "updated",
        attempts: repairItem.attempts + 1,
        updatedAt: new Date().toISOString(),
      };
      repairState.updatedAt = new Date().toISOString();
      await writeJsonFile(options.repairStateFile, repairState);
    } catch (error) {
      const message = getErrorMessage(error);
      repairState.items[item.relativePath] = {
        stage: "failed",
        attempts: repairItem.attempts + 1,
        lastError: message,
        updatedAt: new Date().toISOString(),
      };
      repairState.updatedAt = new Date().toISOString();
      await writeJsonFile(options.repairStateFile, repairState);
      console.error(
        `[library-import] repair failed ${item.relativePath}: ${message}`,
      );

      if (options.failFast) {
        throw error;
      }
    }
  }

  console.log(
    `[library-import] repair: progress saved at ${options.repairStateFile}`,
  );
}

async function main() {
  await loadEnvLocalIfPresent();
  const options = parseCliArgs(process.argv.slice(2));

  await fs.mkdir(options.stateDir, { recursive: true });

  if (options.command === "prepare") {
    await prepareManifest(options);
    return;
  }

  if (options.command === "ingest") {
    await ingestManifest(options);
    return;
  }

  if (options.command === "repair") {
    await repairManifest(options);
    return;
  }

  await prepareManifest(options);
  await ingestManifest(options);
}

main().catch((error) => {
  console.error(`[library-import] fatal: ${getErrorMessage(error)}`);
  process.exit(1);
});
