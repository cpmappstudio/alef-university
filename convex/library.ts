import { mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import { getUserByClerkId } from "./helpers";
import type { Doc, Id } from "./_generated/dataModel";

type AppCtx = QueryCtx | MutationCtx;

const libraryBookStatusValidator = v.union(
  v.literal("ok"),
  v.literal("needs_review"),
  v.literal("failed"),
);

const libraryMetadataValidator = v.object({
  title: v.string(),
  subtitle: v.optional(v.string()),
  authors: v.array(v.string()),
  publishers: v.array(v.string()),
  publishedYear: v.optional(v.number()),
  edition: v.optional(v.string()),
  isbn10: v.optional(v.string()),
  isbn13: v.optional(v.string()),
  abstract: v.optional(v.string()),
  language: v.optional(v.string()),
  categories: v.array(v.string()),
});

const libraryBookReplacementFileValidator = v.object({
  storageId: v.id("_storage"),
  fileName: v.string(),
  fileSizeBytes: v.number(),
});

const libraryBookListItemValidator = v.object({
  id: v.id("library_books"),
  fileName: v.string(),
  fileSizeBytes: v.number(),
  isFavorite: v.boolean(),
  status: libraryBookStatusValidator,
  confidence: v.number(),
  title: v.string(),
  subtitle: v.optional(v.string()),
  authors: v.array(v.string()),
  publishers: v.array(v.string()),
  publishedYear: v.optional(v.number()),
  edition: v.optional(v.string()),
  isbn10: v.optional(v.string()),
  isbn13: v.optional(v.string()),
  abstract: v.optional(v.string()),
  language: v.optional(v.string()),
  categories: v.array(v.string()),
  href: v.optional(v.string()),
  coverUrl: v.optional(v.string()),
  extractionWarnings: v.array(v.string()),
});

const libraryBookDetailValidator = v.object({
  id: v.id("library_books"),
  fileName: v.string(),
  fileSizeBytes: v.number(),
  isFavorite: v.boolean(),
  status: libraryBookStatusValidator,
  confidence: v.number(),
  title: v.string(),
  subtitle: v.optional(v.string()),
  authors: v.array(v.string()),
  publishers: v.array(v.string()),
  publishedYear: v.optional(v.number()),
  edition: v.optional(v.string()),
  isbn10: v.optional(v.string()),
  isbn13: v.optional(v.string()),
  abstract: v.optional(v.string()),
  language: v.optional(v.string()),
  categories: v.array(v.string()),
  href: v.optional(v.string()),
  coverUrl: v.optional(v.string()),
  extractionWarnings: v.array(v.string()),
  createdAt: v.number(),
  updatedAt: v.optional(v.number()),
});

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeOptionalString(value?: string): string | undefined {
  if (!value) {
    return undefined;
  }

  const normalized = normalizeWhitespace(value);
  return normalized.length > 0 ? normalized : undefined;
}

function uniqueStrings(values: string[]): string[] {
  const seen = new Set<string>();
  const output: string[] = [];

  for (const raw of values) {
    const normalized = normalizeWhitespace(raw);
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

function normalizeConfidence(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(1, value));
}

function buildCoverUrl(isbn13?: string, isbn10?: string): string | undefined {
  const isbn = isbn13 ?? isbn10;
  if (!isbn) {
    return undefined;
  }

  return `https://books.google.com/books/content?vid=ISBN${isbn}&printsec=frontcover&img=1&zoom=1&source=gbs_api`;
}

async function toLibraryBookListItem(
  ctx: QueryCtx,
  book: Doc<"library_books">,
  options?: {
    isFavorite?: boolean;
  },
) {
  const href = await ctx.storage.getUrl(book.storageId);

  return {
    id: book._id,
    fileName: book.fileName,
    fileSizeBytes: book.fileSizeBytes,
    isFavorite: options?.isFavorite ?? false,
    status: book.status,
    confidence: book.confidence,
    title: book.title,
    subtitle: book.subtitle,
    authors: book.authors,
    publishers: book.publishers,
    publishedYear: book.publishedYear,
    edition: book.edition,
    isbn10: book.isbn10,
    isbn13: book.isbn13,
    abstract: book.abstract,
    language: book.language,
    categories: book.categories,
    href: href ?? undefined,
    coverUrl: buildCoverUrl(book.isbn13, book.isbn10),
    extractionWarnings: book.extractionWarnings,
  };
}

async function getFavoriteBookIdsForUser(
  ctx: QueryCtx,
  userId: Id<"users">,
): Promise<Set<Id<"library_books">>> {
  const favorites = await ctx.db
    .query("library_book_favorites")
    .withIndex("by_user_id_and_created_at", (q) => q.eq("userId", userId))
    .collect();

  return new Set(favorites.map((favorite) => favorite.bookId));
}

async function getCurrentUser(ctx: AppCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    return null;
  }

  return await getUserByClerkId(ctx.db, identity.subject);
}

async function requireAuthenticatedUser(ctx: AppCtx) {
  const user = await getCurrentUser(ctx);
  if (!user) {
    throw new ConvexError("Not authenticated");
  }
  return user;
}

function requireAdmin(user: { role: string }) {
  if (user.role !== "admin" && user.role !== "superadmin") {
    throw new ConvexError("Admin access required");
  }
}

const DEFAULT_RELATED_BOOK_LIMIT = 6;
const MAX_RELATED_BOOK_LIMIT = 12;

function normalizeLookupKey(value?: string): string | undefined {
  const normalized = normalizeOptionalString(value);
  return normalized ? normalized.toLowerCase() : undefined;
}

function countSharedCategories(
  sourceCategories: Set<string>,
  candidateCategories: string[],
): number {
  if (sourceCategories.size === 0 || candidateCategories.length === 0) {
    return 0;
  }

  const normalizedCandidateCategories = new Set(
    candidateCategories
      .map((category) => normalizeLookupKey(category))
      .filter((category): category is string => Boolean(category)),
  );

  let sharedCount = 0;
  for (const category of normalizedCandidateCategories) {
    if (sourceCategories.has(category)) {
      sharedCount += 1;
    }
  }

  return sharedCount;
}

export const generateLibraryBookUploadUrl = mutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    const user = await requireAuthenticatedUser(ctx);
    requireAdmin(user);

    return await ctx.storage.generateUploadUrl();
  },
});

export const getLibraryUploadDownloadUrl = query({
  args: {
    storageId: v.id("_storage"),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    const user = await requireAuthenticatedUser(ctx);
    requireAdmin(user);

    const existingBook = await ctx.db
      .query("library_books")
      .withIndex("by_storage_id", (q) => q.eq("storageId", args.storageId))
      .first();

    if (existingBook) {
      throw new ConvexError("Storage file is already linked to a library book");
    }

    const metadata = await ctx.storage.getMetadata(args.storageId);
    if (!metadata) {
      throw new ConvexError("Uploaded file not found in storage");
    }

    const url = await ctx.storage.getUrl(args.storageId);
    if (!url) {
      throw new ConvexError("Unable to generate storage download URL");
    }

    return url;
  },
});

export const deleteUnusedLibraryUpload = mutation({
  args: {
    storageId: v.id("_storage"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await requireAuthenticatedUser(ctx);
    requireAdmin(user);

    const existingBook = await ctx.db
      .query("library_books")
      .withIndex("by_storage_id", (q) => q.eq("storageId", args.storageId))
      .first();

    if (existingBook) {
      // Idempotent cleanup: if already linked, do nothing.
      return null;
    }

    await ctx.storage.delete(args.storageId);
    return null;
  },
});

export const createLibraryBook = mutation({
  args: {
    storageId: v.id("_storage"),
    fileName: v.string(),
    fileSizeBytes: v.number(),
    status: libraryBookStatusValidator,
    confidence: v.number(),
    metadata: libraryMetadataValidator,
    extractionWarnings: v.optional(v.array(v.string())),
  },
  returns: v.id("library_books"),
  handler: async (ctx, args) => {
    const user = await requireAuthenticatedUser(ctx);
    requireAdmin(user);

    const existingBook = await ctx.db
      .query("library_books")
      .withIndex("by_storage_id", (q) => q.eq("storageId", args.storageId))
      .first();

    if (existingBook) {
      return existingBook._id;
    }

    const storedFileMetadata = await ctx.storage.getMetadata(args.storageId);
    if (!storedFileMetadata) {
      throw new ConvexError("Uploaded file not found in storage");
    }

    const normalizedTitle = normalizeOptionalString(args.metadata.title);
    if (!normalizedTitle) {
      throw new ConvexError("A valid title is required");
    }

    const now = Date.now();

    return await ctx.db.insert("library_books", {
      storageId: args.storageId,
      fileName: normalizeWhitespace(args.fileName),
      fileSizeBytes: Math.max(0, Math.trunc(args.fileSizeBytes)),
      title: normalizedTitle,
      subtitle: normalizeOptionalString(args.metadata.subtitle),
      authors: uniqueStrings(args.metadata.authors),
      publishers: uniqueStrings(args.metadata.publishers),
      publishedYear: args.metadata.publishedYear,
      edition: normalizeOptionalString(args.metadata.edition),
      isbn10: normalizeOptionalString(args.metadata.isbn10),
      isbn13: normalizeOptionalString(args.metadata.isbn13),
      abstract: normalizeOptionalString(args.metadata.abstract),
      language: normalizeOptionalString(args.metadata.language),
      categories: uniqueStrings(args.metadata.categories),
      status: args.status,
      confidence: normalizeConfidence(args.confidence),
      extractionWarnings: uniqueStrings(args.extractionWarnings ?? []),
      createdBy: user._id,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateLibraryBook = mutation({
  args: {
    bookId: v.id("library_books"),
    status: v.optional(libraryBookStatusValidator),
    metadata: libraryMetadataValidator,
    extractionWarnings: v.optional(v.array(v.string())),
    replacementFile: v.optional(libraryBookReplacementFileValidator),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await requireAuthenticatedUser(ctx);
    requireAdmin(user);

    const existingBook = await ctx.db.get(args.bookId);
    if (!existingBook) {
      throw new ConvexError("Library book not found");
    }

    const normalizedTitle = normalizeOptionalString(args.metadata.title);
    if (!normalizedTitle) {
      throw new ConvexError("A valid title is required");
    }

    const normalizedStatus = args.status ?? existingBook.status;
    const replacementFile = args.replacementFile;

    let replacementStorageId: Id<"_storage"> | undefined;
    let replacementFileName: string | undefined;
    let replacementFileSizeBytes: number | undefined;

    if (replacementFile) {
      const replacementStorageMetadata = await ctx.storage.getMetadata(
        replacementFile.storageId,
      );
      if (!replacementStorageMetadata) {
        throw new ConvexError("Uploaded replacement file not found in storage");
      }

      const linkedBook = await ctx.db
        .query("library_books")
        .withIndex("by_storage_id", (q) =>
          q.eq("storageId", replacementFile.storageId),
        )
        .first();

      if (linkedBook && linkedBook._id !== args.bookId) {
        throw new ConvexError(
          "Replacement storage file is already linked to a different library book",
        );
      }

      replacementStorageId = replacementFile.storageId;
      replacementFileName = normalizeWhitespace(replacementFile.fileName);
      replacementFileSizeBytes = Math.max(
        0,
        Math.trunc(replacementFile.fileSizeBytes),
      );
    }

    await ctx.db.patch(args.bookId, {
      title: normalizedTitle,
      subtitle: normalizeOptionalString(args.metadata.subtitle),
      authors: uniqueStrings(args.metadata.authors),
      publishers: uniqueStrings(args.metadata.publishers),
      publishedYear: args.metadata.publishedYear,
      edition: normalizeOptionalString(args.metadata.edition),
      isbn10: normalizeOptionalString(args.metadata.isbn10),
      isbn13: normalizeOptionalString(args.metadata.isbn13),
      abstract: normalizeOptionalString(args.metadata.abstract),
      language: normalizeOptionalString(args.metadata.language),
      categories: uniqueStrings(args.metadata.categories),
      status: normalizedStatus,
      extractionWarnings: uniqueStrings(
        args.extractionWarnings ?? existingBook.extractionWarnings,
      ),
      storageId: replacementStorageId ?? existingBook.storageId,
      fileName: replacementFileName ?? existingBook.fileName,
      fileSizeBytes: replacementFileSizeBytes ?? existingBook.fileSizeBytes,
      updatedAt: Date.now(),
    });

    if (
      replacementStorageId &&
      replacementStorageId !== existingBook.storageId
    ) {
      await ctx.storage.delete(existingBook.storageId);
    }

    return null;
  },
});

export const deleteLibraryBook = mutation({
  args: {
    bookId: v.id("library_books"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await requireAuthenticatedUser(ctx);
    requireAdmin(user);

    const existingBook = await ctx.db.get(args.bookId);
    if (!existingBook) {
      throw new ConvexError("Library book not found");
    }

    const favorites = await ctx.db
      .query("library_book_favorites")
      .withIndex("by_book_id_and_created_at", (q) =>
        q.eq("bookId", args.bookId),
      )
      .collect();

    for (const favorite of favorites) {
      await ctx.db.delete(favorite._id);
    }

    await ctx.storage.delete(existingBook.storageId);
    await ctx.db.delete(args.bookId);

    return null;
  },
});

export const toggleLibraryBookFavorite = mutation({
  args: {
    bookId: v.id("library_books"),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const user = await requireAuthenticatedUser(ctx);
    const existingBook = await ctx.db.get(args.bookId);

    if (!existingBook) {
      throw new ConvexError("Library book not found");
    }

    const existingFavorite = await ctx.db
      .query("library_book_favorites")
      .withIndex("by_user_id_and_book_id", (q) =>
        q.eq("userId", user._id).eq("bookId", args.bookId),
      )
      .first();

    if (existingFavorite) {
      await ctx.db.delete(existingFavorite._id);
      return false;
    }

    await ctx.db.insert("library_book_favorites", {
      userId: user._id,
      bookId: args.bookId,
      createdAt: Date.now(),
    });

    return true;
  },
});

export const getAllLibraryBooks = query({
  args: {},
  returns: v.array(libraryBookListItemValidator),
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) {
      return [];
    }

    const favoriteBookIds = await getFavoriteBookIdsForUser(ctx, user._id);

    const books = await ctx.db
      .query("library_books")
      .withIndex("by_created_at")
      .order("desc")
      .collect();

    return await Promise.all(
      books.map((book) =>
        toLibraryBookListItem(ctx, book, {
          isFavorite: favoriteBookIds.has(book._id),
        }),
      ),
    );
  },
});

export const getRelatedLibraryBooks = query({
  args: {
    bookId: v.id("library_books"),
    limit: v.optional(v.number()),
  },
  returns: v.array(libraryBookListItemValidator),
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) {
      return [];
    }

    const currentBook = await ctx.db.get(args.bookId);
    if (!currentBook) {
      return [];
    }

    const requestedLimit = args.limit ?? DEFAULT_RELATED_BOOK_LIMIT;
    const normalizedLimit = Math.max(
      1,
      Math.min(MAX_RELATED_BOOK_LIMIT, Math.trunc(requestedLimit)),
    );
    const maxScan = Math.min(600, Math.max(normalizedLimit * 30, 180));

    const sourceCategories = new Set(
      currentBook.categories
        .map((category) => normalizeLookupKey(category))
        .filter((category): category is string => Boolean(category)),
    );
    const sourceLanguage = normalizeLookupKey(currentBook.language);

    const scannedCandidates: Array<Doc<"library_books">> = [];
    for await (const candidate of ctx.db
      .query("library_books")
      .withIndex("by_created_at")
      .order("desc")) {
      if (candidate._id === args.bookId) {
        continue;
      }

      scannedCandidates.push(candidate);
      if (scannedCandidates.length >= maxScan) {
        break;
      }
    }

    const scoredCandidates = scannedCandidates.map((candidate) => {
      const sharedCategories = countSharedCategories(
        sourceCategories,
        candidate.categories,
      );
      const candidateLanguage = normalizeLookupKey(candidate.language);

      return {
        candidate,
        sharedCategories,
        languageMatch:
          Boolean(sourceLanguage) && sourceLanguage === candidateLanguage,
      };
    });

    scoredCandidates.sort((left, right) => {
      if (left.sharedCategories !== right.sharedCategories) {
        return right.sharedCategories - left.sharedCategories;
      }

      if (left.languageMatch !== right.languageMatch) {
        return Number(right.languageMatch) - Number(left.languageMatch);
      }

      return right.candidate.createdAt - left.candidate.createdAt;
    });

    const selectedBooks: Array<Doc<"library_books">> = [];

    for (const entry of scoredCandidates) {
      if (entry.sharedCategories === 0) {
        continue;
      }

      selectedBooks.push(entry.candidate);

      if (selectedBooks.length >= normalizedLimit) {
        break;
      }
    }

    const favoriteBookIds = await getFavoriteBookIdsForUser(ctx, user._id);

    return await Promise.all(
      selectedBooks.map((book) =>
        toLibraryBookListItem(ctx, book, {
          isFavorite: favoriteBookIds.has(book._id),
        }),
      ),
    );
  },
});

export const getMyLibraryBooks = query({
  args: {},
  returns: v.array(libraryBookListItemValidator),
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) {
      return [];
    }

    const favorites = await ctx.db
      .query("library_book_favorites")
      .withIndex("by_user_id_and_created_at", (q) => q.eq("userId", user._id))
      .order("desc")
      .collect();

    const favoriteBooks = await Promise.all(
      favorites.map(async (favorite) => {
        const book = await ctx.db.get(favorite.bookId);
        if (!book) {
          return null;
        }

        return await toLibraryBookListItem(ctx, book, { isFavorite: true });
      }),
    );

    return favoriteBooks.filter(
      (book): book is Awaited<ReturnType<typeof toLibraryBookListItem>> =>
        book !== null,
    );
  },
});

export const getLibraryBookById = query({
  args: {
    id: v.id("library_books"),
  },
  returns: v.union(libraryBookDetailValidator, v.null()),
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) {
      return null;
    }

    const book = await ctx.db.get(args.id);
    if (!book) {
      return null;
    }

    const existingFavorite = await ctx.db
      .query("library_book_favorites")
      .withIndex("by_user_id_and_book_id", (q) =>
        q.eq("userId", user._id).eq("bookId", args.id),
      )
      .first();

    const bookListItem = await toLibraryBookListItem(ctx, book, {
      isFavorite: Boolean(existingFavorite),
    });

    return {
      ...bookListItem,
      createdAt: book.createdAt,
      updatedAt: book.updatedAt,
    };
  },
});
