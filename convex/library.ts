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

const libraryCollectionTreeNodeValidator = v.object({
  id: v.id("library_collections"),
  name: v.string(),
  parentId: v.optional(v.id("library_collections")),
  depth: v.number(),
});

const libraryCollectionPreviewBookValidator = v.object({
  id: v.id("library_books"),
  title: v.string(),
  coverUrl: v.optional(v.string()),
});

const libraryCollectionRecordValidator = v.object({
  id: v.id("library_collections"),
  name: v.string(),
  parentId: v.optional(v.id("library_collections")),
  depth: v.number(),
  bookCount: v.number(),
  previewBooks: v.array(libraryCollectionPreviewBookValidator),
});

const libraryCollectionBreadcrumbValidator = v.object({
  id: v.id("library_collections"),
  name: v.string(),
});

const libraryCollectionBookOptionValidator = v.object({
  id: v.id("library_books"),
  title: v.string(),
  authors: v.array(v.string()),
  isAssigned: v.boolean(),
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

const libraryCollectionBrowserValidator = v.object({
  currentCollection: v.optional(libraryCollectionBreadcrumbValidator),
  breadcrumbs: v.array(libraryCollectionBreadcrumbValidator),
  childCollections: v.array(libraryCollectionRecordValidator),
  books: v.array(libraryBookListItemValidator),
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
  collectionIds: v.array(v.id("library_collections")),
  createdAt: v.number(),
  updatedAt: v.optional(v.number()),
});

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeCollectionName(value: string): string {
  return normalizeWhitespace(value).toLowerCase();
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

function compareCollectionsByName(
  left: Pick<Doc<"library_collections">, "name" | "createdAt">,
  right: Pick<Doc<"library_collections">, "name" | "createdAt">,
): number {
  const byName = left.name.localeCompare(right.name, undefined, {
    sensitivity: "base",
  });

  if (byName !== 0) {
    return byName;
  }

  return left.createdAt - right.createdAt;
}

async function ensureCollectionNameIsAvailable(args: {
  ctx: MutationCtx;
  parentId?: Id<"library_collections">;
  normalizedName: string;
  excludeCollectionId?: Id<"library_collections">;
}) {
  const existingSibling = await args.ctx.db
    .query("library_collections")
    .withIndex("by_parent_id_and_name", (q) =>
      q.eq("parentId", args.parentId).eq("normalizedName", args.normalizedName),
    )
    .first();

  if (existingSibling && existingSibling._id !== args.excludeCollectionId) {
    throw new ConvexError("A collection with this name already exists here");
  }
}

function buildCollectionChildrenMap(
  collections: Doc<"library_collections">[],
): Map<string, Doc<"library_collections">[]> {
  const childrenMap = new Map<string, Doc<"library_collections">[]>();

  for (const collection of collections) {
    const key = collection.parentId ?? "__root__";
    const siblings = childrenMap.get(key) ?? [];
    siblings.push(collection);
    childrenMap.set(key, siblings);
  }

  for (const siblings of childrenMap.values()) {
    siblings.sort(compareCollectionsByName);
  }

  return childrenMap;
}

function buildCollectionDepthMap(
  childrenMap: Map<string, Doc<"library_collections">[]>,
): Map<Id<"library_collections">, number> {
  const depthMap = new Map<Id<"library_collections">, number>();

  function visit(parentId: Id<"library_collections"> | null, depth: number) {
    const key = parentId ?? "__root__";
    const children = childrenMap.get(key) ?? [];

    for (const child of children) {
      depthMap.set(child._id, depth);
      visit(child._id, depth + 1);
    }
  }

  visit(null, 0);
  return depthMap;
}

function collectDescendantCollectionIds(
  collectionId: Id<"library_collections">,
  childrenMap: Map<string, Doc<"library_collections">[]>,
): Id<"library_collections">[] {
  const descendantIds: Id<"library_collections">[] = [];
  const stack: Id<"library_collections">[] = [collectionId];

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) {
      continue;
    }

    descendantIds.push(current);
    const children = childrenMap.get(current) ?? [];
    for (const child of children) {
      stack.push(child._id);
    }
  }

  return descendantIds;
}

function buildCollectionMembershipMap(
  memberships: Doc<"library_book_collections">[],
): Map<Id<"library_collections">, Set<Id<"library_books">>> {
  const membershipMap = new Map<
    Id<"library_collections">,
    Set<Id<"library_books">>
  >();

  for (const membership of memberships) {
    const linkedBooks = membershipMap.get(membership.collectionId) ?? new Set();
    linkedBooks.add(membership.bookId);
    membershipMap.set(membership.collectionId, linkedBooks);
  }

  return membershipMap;
}

function buildDirectBookIdsForCollection(
  collectionId: Id<"library_collections">,
  membershipMap: Map<Id<"library_collections">, Set<Id<"library_books">>>,
): Id<"library_books">[] {
  return [...(membershipMap.get(collectionId) ?? new Set())];
}

function buildBookPreview(book: Doc<"library_books">) {
  return {
    id: book._id,
    title: book.title,
    coverUrl: buildCoverUrl(book.isbn13, book.isbn10),
  };
}

async function syncBookCollections(args: {
  ctx: MutationCtx;
  bookId: Id<"library_books">;
  collectionIds: Id<"library_collections">[];
  userId: Id<"users">;
}) {
  const desiredCollectionIds = [...new Set(args.collectionIds)];

  for (const collectionId of desiredCollectionIds) {
    const collection = await args.ctx.db.get(collectionId);
    if (!collection) {
      throw new ConvexError("Library collection not found");
    }
  }

  const existingMemberships = await args.ctx.db
    .query("library_book_collections")
    .withIndex("by_book_id_and_created_at", (q) => q.eq("bookId", args.bookId))
    .collect();

  const desiredSet = new Set(desiredCollectionIds);

  for (const membership of existingMemberships) {
    if (!desiredSet.has(membership.collectionId)) {
      await args.ctx.db.delete(membership._id);
    }
  }

  const existingSet = new Set(
    existingMemberships.map((item) => item.collectionId),
  );
  const now = Date.now();

  for (const collectionId of desiredCollectionIds) {
    if (existingSet.has(collectionId)) {
      continue;
    }

    await args.ctx.db.insert("library_book_collections", {
      bookId: args.bookId,
      collectionId,
      createdBy: args.userId,
      createdAt: now,
    });
  }
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

export const createLibraryCollection = mutation({
  args: {
    name: v.string(),
    parentId: v.optional(v.id("library_collections")),
  },
  returns: v.id("library_collections"),
  handler: async (ctx, args) => {
    const user = await requireAuthenticatedUser(ctx);
    requireAdmin(user);

    const normalizedName = normalizeOptionalString(args.name);
    if (!normalizedName) {
      throw new ConvexError("A valid collection name is required");
    }

    if (args.parentId) {
      const parentCollection = await ctx.db.get(args.parentId);
      if (!parentCollection) {
        throw new ConvexError("Parent collection not found");
      }
    }

    await ensureCollectionNameIsAvailable({
      ctx,
      parentId: args.parentId,
      normalizedName: normalizeCollectionName(normalizedName),
    });

    return await ctx.db.insert("library_collections", {
      name: normalizedName,
      normalizedName: normalizeCollectionName(normalizedName),
      parentId: args.parentId,
      createdBy: user._id,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const updateLibraryCollection = mutation({
  args: {
    collectionId: v.id("library_collections"),
    name: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await requireAuthenticatedUser(ctx);
    requireAdmin(user);

    const existingCollection = await ctx.db.get(args.collectionId);
    if (!existingCollection) {
      throw new ConvexError("Library collection not found");
    }

    const normalizedName = normalizeOptionalString(args.name);
    if (!normalizedName) {
      throw new ConvexError("A valid collection name is required");
    }

    await ensureCollectionNameIsAvailable({
      ctx,
      parentId: existingCollection.parentId,
      normalizedName: normalizeCollectionName(normalizedName),
      excludeCollectionId: existingCollection._id,
    });

    await ctx.db.patch(args.collectionId, {
      name: normalizedName,
      normalizedName: normalizeCollectionName(normalizedName),
      updatedAt: Date.now(),
    });

    return null;
  },
});

export const deleteLibraryCollection = mutation({
  args: {
    collectionId: v.id("library_collections"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await requireAuthenticatedUser(ctx);
    requireAdmin(user);

    const existingCollection = await ctx.db.get(args.collectionId);
    if (!existingCollection) {
      throw new ConvexError("Library collection not found");
    }

    const childCollection = await ctx.db
      .query("library_collections")
      .withIndex("by_parent_id_and_created_at", (q) =>
        q.eq("parentId", args.collectionId),
      )
      .first();

    if (childCollection) {
      throw new ConvexError(
        "Cannot delete a collection that still contains subcollections",
      );
    }

    const linkedBook = await ctx.db
      .query("library_book_collections")
      .withIndex("by_collection_id_and_created_at", (q) =>
        q.eq("collectionId", args.collectionId),
      )
      .first();

    if (linkedBook) {
      throw new ConvexError(
        "Cannot delete a collection that still contains books",
      );
    }

    await ctx.db.delete(args.collectionId);
    return null;
  },
});

export const getLibraryCollectionBookOptions = query({
  args: {
    collectionId: v.id("library_collections"),
  },
  returns: v.array(libraryCollectionBookOptionValidator),
  handler: async (ctx, args) => {
    const user = await requireAuthenticatedUser(ctx);
    requireAdmin(user);

    const existingCollection = await ctx.db.get(args.collectionId);
    if (!existingCollection) {
      return [];
    }

    const books = await ctx.db
      .query("library_books")
      .withIndex("by_created_at")
      .order("desc")
      .collect();
    const memberships = await ctx.db
      .query("library_book_collections")
      .withIndex("by_collection_id_and_created_at", (q) =>
        q.eq("collectionId", args.collectionId),
      )
      .collect();

    const assignedBookIds = new Set(memberships.map((item) => item.bookId));

    return books.map((book) => ({
      id: book._id,
      title: book.title,
      authors: book.authors,
      isAssigned: assignedBookIds.has(book._id),
    }));
  },
});

export const syncLibraryCollectionBooks = mutation({
  args: {
    collectionId: v.id("library_collections"),
    bookIds: v.array(v.id("library_books")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await requireAuthenticatedUser(ctx);
    requireAdmin(user);

    const existingCollection = await ctx.db.get(args.collectionId);
    if (!existingCollection) {
      throw new ConvexError("Library collection not found");
    }

    const uniqueBookIds = [...new Set(args.bookIds)];

    const existingMemberships = await ctx.db
      .query("library_book_collections")
      .withIndex("by_collection_id_and_created_at", (q) =>
        q.eq("collectionId", args.collectionId),
      )
      .collect();

    const existingBookIds = new Set(
      existingMemberships.map((membership) => membership.bookId),
    );
    const desiredBookIds = new Set(uniqueBookIds);
    let changed = false;

    const now = Date.now();

    for (const bookId of uniqueBookIds) {
      const existingBook = await ctx.db.get(bookId);
      if (!existingBook) {
        throw new ConvexError("Library book not found");
      }
    }

    for (const membership of existingMemberships) {
      if (desiredBookIds.has(membership.bookId)) {
        continue;
      }

      await ctx.db.delete(membership._id);
      changed = true;
    }

    for (const bookId of uniqueBookIds) {
      if (existingBookIds.has(bookId)) {
        continue;
      }

      await ctx.db.insert("library_book_collections", {
        bookId,
        collectionId: args.collectionId,
        createdBy: user._id,
        createdAt: now,
      });
      changed = true;
    }

    if (changed) {
      await ctx.db.patch(args.collectionId, {
        updatedAt: now,
      });
    }

    return null;
  },
});

export const getLibraryCollectionsTree = query({
  args: {},
  returns: v.array(libraryCollectionTreeNodeValidator),
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) {
      return [];
    }

    const collections = await ctx.db
      .query("library_collections")
      .withIndex("by_created_at")
      .order("asc")
      .collect();

    const childrenMap = buildCollectionChildrenMap(collections);
    const depthMap = buildCollectionDepthMap(childrenMap);
    const orderedNodes: Array<{
      id: Id<"library_collections">;
      name: string;
      parentId?: Id<"library_collections">;
      depth: number;
    }> = [];

    function walk(parentId: Id<"library_collections"> | null) {
      const key = parentId ?? "__root__";
      const children = childrenMap.get(key) ?? [];

      for (const child of children) {
        orderedNodes.push({
          id: child._id,
          name: child.name,
          parentId: child.parentId,
          depth: depthMap.get(child._id) ?? 0,
        });
        walk(child._id);
      }
    }

    walk(null);
    return orderedNodes;
  },
});

export const getLibraryCollectionBrowser = query({
  args: {
    collectionId: v.optional(v.id("library_collections")),
  },
  returns: libraryCollectionBrowserValidator,
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) {
      return {
        breadcrumbs: [],
        childCollections: [],
        books: [],
      };
    }

    const collections = await ctx.db
      .query("library_collections")
      .withIndex("by_created_at")
      .order("asc")
      .collect();
    const books = await ctx.db
      .query("library_books")
      .withIndex("by_created_at")
      .order("desc")
      .collect();
    const memberships = await ctx.db
      .query("library_book_collections")
      .collect();

    const collectionMap = new Map(collections.map((item) => [item._id, item]));
    const childrenMap = buildCollectionChildrenMap(collections);
    const depthMap = buildCollectionDepthMap(childrenMap);
    const membershipMap = buildCollectionMembershipMap(memberships);
    const favoriteBookIds = await getFavoriteBookIdsForUser(ctx, user._id);

    const currentCollection = args.collectionId
      ? collectionMap.get(args.collectionId)
      : undefined;

    const breadcrumbs: Array<{
      id: Id<"library_collections">;
      name: string;
    }> = [];

    if (currentCollection) {
      let cursor: Doc<"library_collections"> | undefined = currentCollection;
      while (cursor) {
        breadcrumbs.push({
          id: cursor._id,
          name: cursor.name,
        });
        cursor = cursor.parentId
          ? collectionMap.get(cursor.parentId)
          : undefined;
      }
      breadcrumbs.reverse();
    }

    const currentKey = currentCollection?._id ?? "__root__";
    const childCollections = (childrenMap.get(currentKey) ?? []).map(
      (collection) => {
        const descendantIds = collectDescendantCollectionIds(
          collection._id,
          childrenMap,
        );
        const descendantBookIds = new Set<Id<"library_books">>();

        for (const descendantId of descendantIds) {
          for (const bookId of membershipMap.get(descendantId) ?? new Set()) {
            descendantBookIds.add(bookId);
          }
        }

        const previewBooks = books
          .filter((book) => descendantBookIds.has(book._id))
          .slice(0, 6)
          .map((book) => buildBookPreview(book));

        return {
          id: collection._id,
          name: collection.name,
          parentId: collection.parentId,
          depth: depthMap.get(collection._id) ?? 0,
          bookCount: descendantBookIds.size,
          previewBooks,
        };
      },
    );

    const directBookIds = currentCollection
      ? new Set(
          buildDirectBookIdsForCollection(currentCollection._id, membershipMap),
        )
      : new Set<Id<"library_books">>();

    const currentBooks = books.filter((book) => directBookIds.has(book._id));
    const browserBooks = await Promise.all(
      currentBooks.map((book) =>
        toLibraryBookListItem(ctx, book, {
          isFavorite: favoriteBookIds.has(book._id),
        }),
      ),
    );

    return {
      currentCollection: currentCollection
        ? {
            id: currentCollection._id,
            name: currentCollection.name,
          }
        : undefined,
      breadcrumbs,
      childCollections,
      books: browserBooks,
    };
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
    collectionIds: v.optional(v.array(v.id("library_collections"))),
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

    const bookId = await ctx.db.insert("library_books", {
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

    await syncBookCollections({
      ctx,
      bookId,
      collectionIds: args.collectionIds ?? [],
      userId: user._id,
    });

    return bookId;
  },
});

export const updateLibraryBook = mutation({
  args: {
    bookId: v.id("library_books"),
    status: v.optional(libraryBookStatusValidator),
    metadata: libraryMetadataValidator,
    extractionWarnings: v.optional(v.array(v.string())),
    collectionIds: v.optional(v.array(v.id("library_collections"))),
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

    await syncBookCollections({
      ctx,
      bookId: args.bookId,
      collectionIds: args.collectionIds ?? [],
      userId: user._id,
    });

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

    const memberships = await ctx.db
      .query("library_book_collections")
      .withIndex("by_book_id_and_created_at", (q) =>
        q.eq("bookId", args.bookId),
      )
      .collect();

    for (const membership of memberships) {
      await ctx.db.delete(membership._id);
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

    const collectionMemberships = await ctx.db
      .query("library_book_collections")
      .withIndex("by_book_id_and_created_at", (q) => q.eq("bookId", args.id))
      .collect();

    const bookListItem = await toLibraryBookListItem(ctx, book, {
      isFavorite: Boolean(existingFavorite),
    });

    return {
      ...bookListItem,
      collectionIds: collectionMemberships.map(
        (membership) => membership.collectionId,
      ),
      createdAt: book.createdAt,
      updatedAt: book.updatedAt,
    };
  },
});
