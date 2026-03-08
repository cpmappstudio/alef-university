import { mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { FilterBuilder, NamedTableInfo } from "convex/server";
import { paginationOptsValidator } from "convex/server";
import { ConvexError, v } from "convex/values";
import { getUserByClerkId } from "./helpers";
import type { DataModel, Doc, Id } from "./_generated/dataModel";

type AppCtx = QueryCtx | MutationCtx;
type LibraryBookStatus = Doc<"library_books">["status"];

type NormalizedLibraryCatalogFilters = {
  search?: string;
  statuses: LibraryBookStatus[];
  languages: string[];
  categories: string[];
};

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

const paginatedLibraryCollectionBookOptionValidator = v.object({
  page: v.array(libraryCollectionBookOptionValidator),
  isDone: v.boolean(),
  continueCursor: v.string(),
  splitCursor: v.optional(v.union(v.string(), v.null())),
  pageStatus: v.optional(
    v.union(
      v.literal("SplitRecommended"),
      v.literal("SplitRequired"),
      v.null(),
    ),
  ),
});

const libraryCatalogFilterOptionValidator = v.object({
  value: v.string(),
  label: v.string(),
});

const libraryCatalogFilterOptionsValidator = v.object({
  languages: v.array(libraryCatalogFilterOptionValidator),
  categories: v.array(libraryCatalogFilterOptionValidator),
});

const libraryCatalogPageArgsValidator = {
  search: v.optional(v.string()),
  statuses: v.optional(v.array(libraryBookStatusValidator)),
  languages: v.optional(v.array(v.string())),
  categories: v.optional(v.array(v.string())),
  paginationOpts: paginationOptsValidator,
} as const;

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

const paginatedLibraryBookListItemValidator = v.object({
  page: v.array(libraryBookListItemValidator),
  isDone: v.boolean(),
  continueCursor: v.string(),
  splitCursor: v.optional(v.union(v.string(), v.null())),
  pageStatus: v.optional(
    v.union(
      v.literal("SplitRecommended"),
      v.literal("SplitRequired"),
      v.null(),
    ),
  ),
});

const libraryCollectionBrowserValidator = v.object({
  currentCollection: v.optional(libraryCollectionBreadcrumbValidator),
  breadcrumbs: v.array(libraryCollectionBreadcrumbValidator),
  childCollections: v.array(libraryCollectionRecordValidator),
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

function buildLibraryBookSearchText(args: {
  title: string;
  subtitle?: string;
  authors: string[];
  publishers: string[];
  categories: string[];
  isbn10?: string;
  isbn13?: string;
  fileName: string;
}) {
  return [
    args.title,
    args.subtitle,
    args.authors.join(" "),
    args.publishers.join(" "),
    args.categories.join(" "),
    args.isbn10,
    args.isbn13,
    args.fileName,
  ]
    .filter((value): value is string => Boolean(value))
    .map((value) => normalizeWhitespace(value))
    .join(" ");
}

function normalizeLanguageKey(value?: string): string | undefined {
  const normalized = normalizeOptionalString(value);
  return normalized ? normalized.toLowerCase() : undefined;
}

function getPrimaryCategoryValue(categories: string[]): string | undefined {
  const uniqueCategories = uniqueStrings(categories);
  return uniqueCategories[0];
}

function normalizeCategoryKey(value?: string): string | undefined {
  const normalized = normalizeOptionalString(value);
  return normalized ? normalized.toLowerCase() : undefined;
}

function getPrimaryCategoryKey(categories: string[]): string | undefined {
  return normalizeCategoryKey(getPrimaryCategoryValue(categories));
}

function buildLibraryBookIndexFields(args: {
  language?: string;
  categories: string[];
}) {
  return {
    languageKey: normalizeLanguageKey(args.language),
    primaryCategoryKey: getPrimaryCategoryKey(args.categories),
  };
}

function buildLibraryBookDerivedFields(args: {
  title: string;
  subtitle?: string;
  authors: string[];
  publishers: string[];
  categories: string[];
  isbn10?: string;
  isbn13?: string;
  fileName: string;
  language?: string;
}) {
  const normalizedCategories = uniqueStrings(args.categories);

  return {
    searchText: buildLibraryBookSearchText({
      title: args.title,
      subtitle: args.subtitle,
      authors: args.authors,
      publishers: args.publishers,
      categories: normalizedCategories,
      isbn10: args.isbn10,
      isbn13: args.isbn13,
      fileName: args.fileName,
    }),
    ...buildLibraryBookIndexFields({
      language: args.language,
      categories: normalizedCategories,
    }),
  };
}

function normalizeLookupValues(values?: string[]): string[] {
  if (!values || values.length === 0) {
    return [];
  }

  return [
    ...new Set(
      values
        .map((value) => normalizeOptionalString(value))
        .filter((value): value is string => Boolean(value))
        .map((value) => value.toLowerCase()),
    ),
  ];
}

function normalizeStatusValues(
  values?: LibraryBookStatus[],
): LibraryBookStatus[] {
  if (!values || values.length === 0) {
    return [];
  }

  return [...new Set(values)];
}

function normalizeLibraryCatalogFilters(args: {
  search?: string;
  statuses?: LibraryBookStatus[];
  languages?: string[];
  categories?: string[];
}): NormalizedLibraryCatalogFilters {
  return {
    search: normalizeOptionalString(args.search),
    statuses: normalizeStatusValues(args.statuses),
    languages: normalizeLookupValues(args.languages),
    categories: normalizeLookupValues(args.categories),
  };
}

function matchesLibraryCatalogFilters(
  item: {
    status?: LibraryBookStatus;
    languageKey?: string;
    primaryCategoryKey?: string;
  },
  filters: NormalizedLibraryCatalogFilters,
) {
  if (
    filters.statuses.length > 0 &&
    (!item.status || !filters.statuses.includes(item.status))
  ) {
    return false;
  }

  if (
    filters.languages.length > 0 &&
    (!item.languageKey || !filters.languages.includes(item.languageKey))
  ) {
    return false;
  }

  if (
    filters.categories.length > 0 &&
    (!item.primaryCategoryKey ||
      !filters.categories.includes(item.primaryCategoryKey))
  ) {
    return false;
  }

  return true;
}

function withLibraryCatalogPaginationBudget(paginationOpts: {
  numItems: number;
  cursor: string | null;
  endCursor?: string | null;
  id?: number;
  maximumRowsRead?: number;
  maximumBytesRead?: number;
}) {
  return {
    ...paginationOpts,
    maximumRowsRead:
      paginationOpts.maximumRowsRead ??
      Math.max(400, Math.trunc(paginationOpts.numItems) * 30),
  };
}

function buildLibraryCatalogWriteFields(args: {
  fileName: string;
  fileSizeBytes: number;
  status: LibraryBookStatus;
  confidence: number;
  metadata: {
    title: string;
    subtitle?: string;
    authors: string[];
    publishers: string[];
    publishedYear?: number;
    edition?: string;
    isbn10?: string;
    isbn13?: string;
    abstract?: string;
    language?: string;
    categories: string[];
  };
  extractionWarnings?: string[];
}) {
  const normalizedTitle = normalizeOptionalString(args.metadata.title);
  if (!normalizedTitle) {
    throw new ConvexError("A valid title is required");
  }

  const normalizedSubtitle = normalizeOptionalString(args.metadata.subtitle);
  const normalizedAuthors = uniqueStrings(args.metadata.authors);
  const normalizedPublishers = uniqueStrings(args.metadata.publishers);
  const normalizedEdition = normalizeOptionalString(args.metadata.edition);
  const normalizedIsbn10 = normalizeOptionalString(args.metadata.isbn10);
  const normalizedIsbn13 = normalizeOptionalString(args.metadata.isbn13);
  const normalizedAbstract = normalizeOptionalString(args.metadata.abstract);
  const normalizedLanguage = normalizeOptionalString(args.metadata.language);
  const normalizedCategories = uniqueStrings(args.metadata.categories);
  const normalizedFileName = normalizeWhitespace(args.fileName);

  return {
    fileName: normalizedFileName,
    fileSizeBytes: Math.max(0, Math.trunc(args.fileSizeBytes)),
    ...buildLibraryBookDerivedFields({
      title: normalizedTitle,
      subtitle: normalizedSubtitle,
      authors: normalizedAuthors,
      publishers: normalizedPublishers,
      categories: normalizedCategories,
      isbn10: normalizedIsbn10,
      isbn13: normalizedIsbn13,
      fileName: normalizedFileName,
      language: normalizedLanguage,
    }),
    title: normalizedTitle,
    subtitle: normalizedSubtitle,
    authors: normalizedAuthors,
    publishers: normalizedPublishers,
    publishedYear: args.metadata.publishedYear,
    edition: normalizedEdition,
    isbn10: normalizedIsbn10,
    isbn13: normalizedIsbn13,
    abstract: normalizedAbstract,
    language: normalizedLanguage,
    categories: normalizedCategories,
    status: args.status,
    confidence: normalizeConfidence(args.confidence),
    extractionWarnings: uniqueStrings(args.extractionWarnings ?? []),
  };
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

function buildBookPreview(book: Doc<"library_books">) {
  return {
    id: book._id,
    title: book.title,
    coverUrl: buildCoverUrl(book.isbn13, book.isbn10),
  };
}

function buildLibraryCollectionMembershipSnapshot(args: {
  searchText?: string;
  bookCreatedAt: number;
}) {
  return {
    searchText: args.searchText,
    bookCreatedAt: args.bookCreatedAt,
  };
}

async function getCollectionAncestorIds(
  ctx: AppCtx,
  collectionId: Id<"library_collections">,
): Promise<Id<"library_collections">[]> {
  const ancestorIds: Id<"library_collections">[] = [];
  let cursor: Doc<"library_collections"> | null =
    await ctx.db.get(collectionId);

  while (cursor) {
    ancestorIds.push(cursor._id);
    cursor = cursor.parentId ? await ctx.db.get(cursor.parentId) : null;
  }

  return ancestorIds;
}

async function buildAncestorOccurrences(args: {
  ctx: AppCtx;
  collectionIds: Id<"library_collections">[];
}) {
  const occurrences = new Map<Id<"library_collections">, number>();
  const ancestorCache = new Map<
    Id<"library_collections">,
    Id<"library_collections">[]
  >();

  for (const collectionId of args.collectionIds) {
    let ancestorIds = ancestorCache.get(collectionId);

    if (!ancestorIds) {
      ancestorIds = await getCollectionAncestorIds(args.ctx, collectionId);
      ancestorCache.set(collectionId, ancestorIds);
    }

    for (const ancestorId of ancestorIds) {
      occurrences.set(ancestorId, (occurrences.get(ancestorId) ?? 0) + 1);
    }
  }

  return occurrences;
}

async function incrementCollectionRollupsByOccurrences(args: {
  ctx: MutationCtx;
  bookId: Id<"library_books">;
  bookCreatedAt: number;
  ancestorOccurrences: Map<Id<"library_collections">, number>;
  updatedAt: number;
}) {
  for (const [
    collectionId,
    incrementBy,
  ] of args.ancestorOccurrences.entries()) {
    const existingRollup = await args.ctx.db
      .query("library_collection_book_rollups")
      .withIndex("by_collection_id_and_book_id", (q) =>
        q.eq("collectionId", collectionId).eq("bookId", args.bookId),
      )
      .first();

    if (existingRollup) {
      await args.ctx.db.patch(existingRollup._id, {
        referenceCount: existingRollup.referenceCount + incrementBy,
        updatedAt: args.updatedAt,
      });
      continue;
    }

    await args.ctx.db.insert("library_collection_book_rollups", {
      collectionId,
      bookId: args.bookId,
      referenceCount: incrementBy,
      bookCreatedAt: args.bookCreatedAt,
      updatedAt: args.updatedAt,
    });

    const collection = await args.ctx.db.get(collectionId);
    if (collection) {
      await args.ctx.db.patch(collectionId, {
        bookCount: (collection.bookCount ?? 0) + 1,
        updatedAt: args.updatedAt,
      });
    }
  }
}

async function decrementCollectionRollupsByOccurrences(args: {
  ctx: MutationCtx;
  bookId: Id<"library_books">;
  ancestorOccurrences: Map<Id<"library_collections">, number>;
  updatedAt: number;
}) {
  for (const [
    collectionId,
    decrementBy,
  ] of args.ancestorOccurrences.entries()) {
    const existingRollup = await args.ctx.db
      .query("library_collection_book_rollups")
      .withIndex("by_collection_id_and_book_id", (q) =>
        q.eq("collectionId", collectionId).eq("bookId", args.bookId),
      )
      .first();

    if (!existingRollup) {
      continue;
    }

    const nextReferenceCount = existingRollup.referenceCount - decrementBy;

    if (nextReferenceCount > 0) {
      await args.ctx.db.patch(existingRollup._id, {
        referenceCount: nextReferenceCount,
        updatedAt: args.updatedAt,
      });
      continue;
    }

    await args.ctx.db.delete(existingRollup._id);

    const collection = await args.ctx.db.get(collectionId);
    if (collection) {
      await args.ctx.db.patch(collectionId, {
        bookCount: Math.max(0, (collection.bookCount ?? 0) - 1),
        updatedAt: args.updatedAt,
      });
    }
  }
}

async function incrementCollectionRollups(args: {
  ctx: MutationCtx;
  bookId: Id<"library_books">;
  bookCreatedAt: number;
  collectionIds: Id<"library_collections">[];
  updatedAt: number;
}) {
  if (args.collectionIds.length === 0) {
    return;
  }

  const ancestorOccurrences = await buildAncestorOccurrences({
    ctx: args.ctx,
    collectionIds: args.collectionIds,
  });

  await incrementCollectionRollupsByOccurrences({
    ctx: args.ctx,
    bookId: args.bookId,
    bookCreatedAt: args.bookCreatedAt,
    ancestorOccurrences,
    updatedAt: args.updatedAt,
  });
}

async function decrementCollectionRollups(args: {
  ctx: MutationCtx;
  bookId: Id<"library_books">;
  collectionIds: Id<"library_collections">[];
  updatedAt: number;
}) {
  if (args.collectionIds.length === 0) {
    return;
  }

  const ancestorOccurrences = await buildAncestorOccurrences({
    ctx: args.ctx,
    collectionIds: args.collectionIds,
  });

  await decrementCollectionRollupsByOccurrences({
    ctx: args.ctx,
    bookId: args.bookId,
    ancestorOccurrences,
    updatedAt: args.updatedAt,
  });
}

async function loadCollectionPreviewBooks(
  ctx: QueryCtx,
  collectionId: Id<"library_collections">,
  limit = 6,
) {
  const rollups = await ctx.db
    .query("library_collection_book_rollups")
    .withIndex("by_collection_id_and_book_created_at", (q) =>
      q.eq("collectionId", collectionId),
    )
    .order("desc")
    .take(limit);

  const previewBooks = await Promise.all(
    rollups.map(async (rollup) => {
      const book = await ctx.db.get(rollup.bookId);
      return book ? buildBookPreview(book) : null;
    }),
  );

  return previewBooks.filter(
    (previewBook): previewBook is ReturnType<typeof buildBookPreview> =>
      previewBook !== null,
  );
}

async function syncBookCollections(args: {
  ctx: MutationCtx;
  bookId: Id<"library_books">;
  bookCreatedAt: number;
  bookSearchText?: string;
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

  const existingSet = new Set(
    existingMemberships.map((item) => item.collectionId),
  );
  const now = Date.now();
  const removedCollectionIds: Id<"library_collections">[] = [];
  const addedCollectionIds: Id<"library_collections">[] = [];
  const desiredSet = new Set(desiredCollectionIds);

  for (const membership of existingMemberships) {
    if (desiredSet.has(membership.collectionId)) {
      continue;
    }

    removedCollectionIds.push(membership.collectionId);
    await args.ctx.db.delete(membership._id);
  }

  for (const collectionId of desiredCollectionIds) {
    if (existingSet.has(collectionId)) {
      continue;
    }

    addedCollectionIds.push(collectionId);
    await args.ctx.db.insert("library_book_collections", {
      bookId: args.bookId,
      collectionId,
      ...buildLibraryCollectionMembershipSnapshot({
        searchText: args.bookSearchText,
        bookCreatedAt: args.bookCreatedAt,
      }),
      createdBy: args.userId,
      createdAt: now,
    });
  }

  await decrementCollectionRollups({
    ctx: args.ctx,
    bookId: args.bookId,
    collectionIds: removedCollectionIds,
    updatedAt: now,
  });

  await incrementCollectionRollups({
    ctx: args.ctx,
    bookId: args.bookId,
    bookCreatedAt: args.bookCreatedAt,
    collectionIds: addedCollectionIds,
    updatedAt: now,
  });
}

function buildLibraryBookBaseRecord(
  book: Doc<"library_books">,
  options?: {
    isFavorite?: boolean;
  },
) {
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
    coverUrl: buildCoverUrl(book.isbn13, book.isbn10),
    extractionWarnings: book.extractionWarnings,
  };
}

function buildLibraryFavoriteSnapshot(book: {
  searchText?: string;
  status: Doc<"library_books">["status"];
  languageKey?: string;
  primaryCategoryKey?: string;
}) {
  return {
    searchText: book.searchText,
    status: book.status,
    languageKey: book.languageKey,
    primaryCategoryKey: book.primaryCategoryKey,
  };
}

async function adjustFacetCount(args: {
  ctx: MutationCtx;
  table: "library_language_facets" | "library_primary_category_facets";
  key?: string;
  label?: string;
  delta: number;
}) {
  const normalizedKey = normalizeOptionalString(args.key)?.toLowerCase();
  if (!normalizedKey || args.delta === 0) {
    return;
  }

  const existingFacet = await args.ctx.db
    .query(args.table)
    .withIndex("by_key", (q) => q.eq("key", normalizedKey))
    .first();

  if (!existingFacet) {
    if (args.delta < 0 || !args.label) {
      return;
    }

    await args.ctx.db.insert(args.table, {
      key: normalizedKey,
      label: normalizeWhitespace(args.label),
      bookCount: args.delta,
    });
    return;
  }

  const nextBookCount = existingFacet.bookCount + args.delta;

  if (nextBookCount <= 0) {
    await args.ctx.db.delete(existingFacet._id);
    return;
  }

  await args.ctx.db.patch(existingFacet._id, {
    label: args.label ? normalizeWhitespace(args.label) : existingFacet.label,
    bookCount: nextBookCount,
  });
}

async function syncLibraryBookFacets(args: {
  ctx: MutationCtx;
  previousLanguage?: string;
  nextLanguage?: string;
  previousPrimaryCategory?: string;
  nextPrimaryCategory?: string;
}) {
  const previousLanguageKey = normalizeLanguageKey(args.previousLanguage);
  const nextLanguageKey = normalizeLanguageKey(args.nextLanguage);
  if (previousLanguageKey !== nextLanguageKey) {
    await adjustFacetCount({
      ctx: args.ctx,
      table: "library_language_facets",
      key: previousLanguageKey,
      delta: -1,
    });
    await adjustFacetCount({
      ctx: args.ctx,
      table: "library_language_facets",
      key: nextLanguageKey,
      label: args.nextLanguage,
      delta: 1,
    });
  }

  const previousCategoryKey = normalizeCategoryKey(
    args.previousPrimaryCategory,
  );
  const nextCategoryKey = normalizeCategoryKey(args.nextPrimaryCategory);
  if (previousCategoryKey !== nextCategoryKey) {
    await adjustFacetCount({
      ctx: args.ctx,
      table: "library_primary_category_facets",
      key: previousCategoryKey,
      delta: -1,
    });
    await adjustFacetCount({
      ctx: args.ctx,
      table: "library_primary_category_facets",
      key: nextCategoryKey,
      label: args.nextPrimaryCategory,
      delta: 1,
    });
  }
}

async function syncFavoriteSnapshotsForBook(args: {
  ctx: MutationCtx;
  bookId: Id<"library_books">;
  snapshot: ReturnType<typeof buildLibraryFavoriteSnapshot>;
}) {
  const favorites = await args.ctx.db
    .query("library_book_favorites")
    .withIndex("by_book_id_and_created_at", (q) => q.eq("bookId", args.bookId))
    .collect();

  for (const favorite of favorites) {
    await args.ctx.db.patch(favorite._id, args.snapshot);
  }
}

async function syncCollectionMembershipSnapshotsForBook(args: {
  ctx: MutationCtx;
  bookId: Id<"library_books">;
  snapshot: ReturnType<typeof buildLibraryCollectionMembershipSnapshot>;
}) {
  const memberships = await args.ctx.db
    .query("library_book_collections")
    .withIndex("by_book_id_and_created_at", (q) => q.eq("bookId", args.bookId))
    .collect();

  for (const membership of memberships) {
    await args.ctx.db.patch(membership._id, args.snapshot);
  }
}

async function rebuildFacetTable(args: {
  ctx: MutationCtx;
  table: "library_language_facets" | "library_primary_category_facets";
  entries: Array<{
    key: string;
    label: string;
    bookCount: number;
  }>;
}) {
  const existingRows = await args.ctx.db.query(args.table).collect();

  for (const row of existingRows) {
    await args.ctx.db.delete(row._id);
  }

  for (const entry of args.entries) {
    await args.ctx.db.insert(args.table, entry);
  }
}

function buildLibraryCatalogFilterOptionsFromFacets(args: {
  languageFacets: Doc<"library_language_facets">[];
  categoryFacets: Doc<"library_primary_category_facets">[];
}) {
  const toOption = (entry: { key: string; label: string }) => ({
    value: entry.key,
    label: entry.label,
  });

  return {
    languages: args.languageFacets
      .slice()
      .sort((left, right) => left.label.localeCompare(right.label))
      .map(toOption),
    categories: args.categoryFacets
      .slice()
      .sort((left, right) => left.label.localeCompare(right.label))
      .map(toOption),
  };
}

type LibraryCatalogFilterTableInfo =
  | NamedTableInfo<DataModel, "library_books">
  | NamedTableInfo<DataModel, "library_book_favorites">;

function buildLibraryCatalogFilterPredicate<
  TableInfo extends LibraryCatalogFilterTableInfo,
>(filters: NormalizedLibraryCatalogFilters) {
  const hasStatusFilters = filters.statuses.length > 0;
  const hasLanguageFilters = filters.languages.length > 0;
  const hasCategoryFilters = filters.categories.length > 0;

  if (!hasStatusFilters && !hasLanguageFilters && !hasCategoryFilters) {
    return null;
  }

  return (q: FilterBuilder<TableInfo>) => {
    const clauses = [];

    if (hasStatusFilters) {
      clauses.push(
        filters.statuses.length === 1
          ? q.eq(q.field("status"), filters.statuses[0] as never)
          : q.or(
              ...filters.statuses.map((status) =>
                q.eq(q.field("status"), status as never),
              ),
            ),
      );
    }

    if (hasLanguageFilters) {
      clauses.push(
        filters.languages.length === 1
          ? q.eq(q.field("languageKey"), filters.languages[0] as never)
          : q.or(
              ...filters.languages.map((language) =>
                q.eq(q.field("languageKey"), language as never),
              ),
            ),
      );
    }

    if (hasCategoryFilters) {
      clauses.push(
        filters.categories.length === 1
          ? q.eq(q.field("primaryCategoryKey"), filters.categories[0] as never)
          : q.or(
              ...filters.categories.map((category) =>
                q.eq(q.field("primaryCategoryKey"), category as never),
              ),
            ),
      );
    }

    return clauses.length === 1 ? clauses[0] : q.and(...clauses);
  };
}

async function getFavoriteBookIdsForBooks(args: {
  ctx: QueryCtx;
  userId: Id<"users">;
  bookIds: Id<"library_books">[];
}) {
  const uniqueBookIds = [...new Set(args.bookIds)];

  if (uniqueBookIds.length === 0) {
    return new Set<Id<"library_books">>();
  }

  const favorites = await Promise.all(
    uniqueBookIds.map(async (bookId) => {
      const favorite = await args.ctx.db
        .query("library_book_favorites")
        .withIndex("by_user_id_and_book_id", (q) =>
          q.eq("userId", args.userId).eq("bookId", bookId),
        )
        .first();

      return favorite ? bookId : null;
    }),
  );

  return new Set(
    favorites.filter(
      (bookId): bookId is Id<"library_books"> => bookId !== null,
    ),
  );
}

async function buildPaginatedLibraryBooksPage(args: {
  ctx: QueryCtx;
  userId: Id<"users">;
  books: Doc<"library_books">[];
  pageResult: {
    isDone: boolean;
    continueCursor: string;
    splitCursor?: string | null;
    pageStatus?: "SplitRecommended" | "SplitRequired" | null;
  };
}) {
  const favoriteBookIds = await getFavoriteBookIdsForBooks({
    ctx: args.ctx,
    userId: args.userId,
    bookIds: args.books.map((book) => book._id),
  });

  return {
    ...args.pageResult,
    page: await Promise.all(
      args.books.map((book) =>
        toLibraryBookListItem(args.ctx, book, {
          isFavorite: favoriteBookIds.has(book._id),
        }),
      ),
    ),
  };
}

async function toLibraryBookListItem(
  ctx: QueryCtx,
  book: Doc<"library_books">,
  options?: {
    isFavorite?: boolean;
    includeHref?: boolean;
  },
) {
  const baseRecord = buildLibraryBookBaseRecord(book, options);

  if (!options?.includeHref) {
    return baseRecord;
  }

  const href = await ctx.storage.getUrl(book.storageId);

  return {
    ...baseRecord,
    href: href ?? undefined,
  };
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

function getSingleSelectedValue<T extends string>(values: T[]): T | undefined {
  return values.length === 1 ? values[0] : undefined;
}

function getAllBooksBaseQuery(
  ctx: QueryCtx,
  filters: NormalizedLibraryCatalogFilters,
) {
  const singleCategory = getSingleSelectedValue(filters.categories);
  if (singleCategory) {
    return ctx.db
      .query("library_books")
      .withIndex("by_primary_category_key_and_created_at", (q) =>
        q.eq("primaryCategoryKey", singleCategory),
      )
      .order("desc");
  }

  const singleLanguage = getSingleSelectedValue(filters.languages);
  if (singleLanguage) {
    return ctx.db
      .query("library_books")
      .withIndex("by_language_key_and_created_at", (q) =>
        q.eq("languageKey", singleLanguage),
      )
      .order("desc");
  }

  const singleStatus = getSingleSelectedValue(filters.statuses);
  if (singleStatus) {
    return ctx.db
      .query("library_books")
      .withIndex("by_status_and_created_at", (q) =>
        q.eq("status", singleStatus),
      )
      .order("desc");
  }

  return ctx.db.query("library_books").withIndex("by_created_at").order("desc");
}

function getFavoriteBooksBaseQuery(
  ctx: QueryCtx,
  userId: Id<"users">,
  filters: NormalizedLibraryCatalogFilters,
) {
  const singleCategory = getSingleSelectedValue(filters.categories);
  if (singleCategory) {
    return ctx.db
      .query("library_book_favorites")
      .withIndex("by_user_id_and_primary_category_key_and_created_at", (q) =>
        q.eq("userId", userId).eq("primaryCategoryKey", singleCategory),
      )
      .order("desc");
  }

  const singleLanguage = getSingleSelectedValue(filters.languages);
  if (singleLanguage) {
    return ctx.db
      .query("library_book_favorites")
      .withIndex("by_user_id_and_language_key_and_created_at", (q) =>
        q.eq("userId", userId).eq("languageKey", singleLanguage),
      )
      .order("desc");
  }

  const singleStatus = getSingleSelectedValue(filters.statuses);
  if (singleStatus) {
    return ctx.db
      .query("library_book_favorites")
      .withIndex("by_user_id_and_status_and_created_at", (q) =>
        q.eq("userId", userId).eq("status", singleStatus),
      )
      .order("desc");
  }

  return ctx.db
    .query("library_book_favorites")
    .withIndex("by_user_id_and_created_at", (q) => q.eq("userId", userId))
    .order("desc");
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
      bookCount: 0,
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
    search: v.optional(v.string()),
    paginationOpts: paginationOptsValidator,
  },
  returns: paginatedLibraryCollectionBookOptionValidator,
  handler: async (ctx, args) => {
    const user = await requireAuthenticatedUser(ctx);
    requireAdmin(user);

    const existingCollection = await ctx.db.get(args.collectionId);
    if (!existingCollection) {
      return {
        page: [],
        isDone: true,
        continueCursor: args.paginationOpts.cursor ?? "",
        splitCursor: null,
        pageStatus: null,
      };
    }

    const normalizedSearch = normalizeOptionalString(args.search);
    const pageResult = normalizedSearch
      ? await ctx.db
          .query("library_books")
          .withSearchIndex("search_text", (q) =>
            q.search("searchText", normalizedSearch),
          )
          .paginate(args.paginationOpts)
      : await ctx.db
          .query("library_books")
          .withIndex("by_created_at")
          .order("desc")
          .paginate(args.paginationOpts);

    const page = await Promise.all(
      pageResult.page.map(async (book) => {
        const membership = await ctx.db
          .query("library_book_collections")
          .withIndex("by_collection_id_and_book_id", (q) =>
            q.eq("collectionId", args.collectionId).eq("bookId", book._id),
          )
          .first();

        return {
          id: book._id,
          title: book.title,
          authors: book.authors,
          isAssigned: Boolean(membership),
        };
      }),
    );

    return {
      ...pageResult,
      page,
    };
  },
});

export const updateLibraryCollectionBooks = mutation({
  args: {
    collectionId: v.id("library_collections"),
    addBookIds: v.array(v.id("library_books")),
    removeBookIds: v.array(v.id("library_books")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await requireAuthenticatedUser(ctx);
    requireAdmin(user);

    const existingCollection = await ctx.db.get(args.collectionId);
    if (!existingCollection) {
      throw new ConvexError("Library collection not found");
    }

    const now = Date.now();
    const addBookIds = [...new Set(args.addBookIds)];
    const removeBookIds = [...new Set(args.removeBookIds)].filter(
      (bookId) => !addBookIds.includes(bookId),
    );
    const ancestorOccurrences = await buildAncestorOccurrences({
      ctx,
      collectionIds: [args.collectionId],
    });
    let changed = false;

    for (const bookId of removeBookIds) {
      const membership = await ctx.db
        .query("library_book_collections")
        .withIndex("by_collection_id_and_book_id", (q) =>
          q.eq("collectionId", args.collectionId).eq("bookId", bookId),
        )
        .first();

      if (!membership) {
        continue;
      }

      await ctx.db.delete(membership._id);
      await decrementCollectionRollupsByOccurrences({
        ctx,
        bookId,
        ancestorOccurrences,
        updatedAt: now,
      });
      changed = true;
    }

    for (const bookId of addBookIds) {
      const existingBook = await ctx.db.get(bookId);
      if (!existingBook) {
        throw new ConvexError("Library book not found");
      }

      const membership = await ctx.db
        .query("library_book_collections")
        .withIndex("by_collection_id_and_book_id", (q) =>
          q.eq("collectionId", args.collectionId).eq("bookId", bookId),
        )
        .first();

      if (membership) {
        continue;
      }

      const derivedFields = buildLibraryBookDerivedFields({
        title: existingBook.title,
        subtitle: existingBook.subtitle,
        authors: existingBook.authors,
        publishers: existingBook.publishers,
        categories: existingBook.categories,
        isbn10: existingBook.isbn10,
        isbn13: existingBook.isbn13,
        fileName: existingBook.fileName,
        language: existingBook.language,
      });

      await ctx.db.insert("library_book_collections", {
        bookId,
        collectionId: args.collectionId,
        ...buildLibraryCollectionMembershipSnapshot({
          searchText: existingBook.searchText ?? derivedFields.searchText,
          bookCreatedAt: existingBook.createdAt,
        }),
        createdBy: user._id,
        createdAt: now,
      });
      await incrementCollectionRollupsByOccurrences({
        ctx,
        bookId,
        bookCreatedAt: existingBook.createdAt,
        ancestorOccurrences,
        updatedAt: now,
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

export const rebuildLibraryDerivedState = mutation({
  args: {},
  returns: v.object({
    updatedBooks: v.number(),
    updatedCollections: v.number(),
    rebuiltRollups: v.number(),
  }),
  handler: async (ctx) => {
    const user = await requireAuthenticatedUser(ctx);
    requireAdmin(user);

    const books = await ctx.db
      .query("library_books")
      .withIndex("by_created_at")
      .order("asc")
      .collect();
    const collections = await ctx.db
      .query("library_collections")
      .withIndex("by_created_at")
      .order("asc")
      .collect();
    const memberships = await ctx.db
      .query("library_book_collections")
      .collect();
    const favorites = await ctx.db.query("library_book_favorites").collect();
    const existingRollups = await ctx.db
      .query("library_collection_book_rollups")
      .collect();

    for (const rollup of existingRollups) {
      await ctx.db.delete(rollup._id);
    }

    const languageFacetAccumulator = new Map<
      string,
      {
        key: string;
        label: string;
        bookCount: number;
      }
    >();
    const categoryFacetAccumulator = new Map<
      string,
      {
        key: string;
        label: string;
        bookCount: number;
      }
    >();
    const bookSnapshotMap = new Map<
      Id<"library_books">,
      ReturnType<typeof buildLibraryFavoriteSnapshot>
    >();
    const membershipsByBookId = new Map<
      Id<"library_books">,
      Doc<"library_book_collections">[]
    >();

    for (const membership of memberships) {
      const linkedMemberships =
        membershipsByBookId.get(membership.bookId) ?? [];
      linkedMemberships.push(membership);
      membershipsByBookId.set(membership.bookId, linkedMemberships);
    }

    let updatedBooks = 0;
    for (const book of books) {
      const derivedFields = buildLibraryBookDerivedFields({
        title: book.title,
        subtitle: book.subtitle,
        authors: book.authors,
        publishers: book.publishers,
        categories: book.categories,
        isbn10: book.isbn10,
        isbn13: book.isbn13,
        fileName: book.fileName,
        language: book.language,
      });

      if (
        book.searchText !== derivedFields.searchText ||
        book.languageKey !== derivedFields.languageKey ||
        book.primaryCategoryKey !== derivedFields.primaryCategoryKey
      ) {
        await ctx.db.patch(book._id, derivedFields);
        updatedBooks += 1;
      }

      if (derivedFields.languageKey && book.language) {
        const entry = languageFacetAccumulator.get(
          derivedFields.languageKey,
        ) ?? {
          key: derivedFields.languageKey,
          label: book.language,
          bookCount: 0,
        };
        entry.bookCount += 1;
        languageFacetAccumulator.set(entry.key, entry);
      }

      const primaryCategory = getPrimaryCategoryValue(book.categories);
      if (derivedFields.primaryCategoryKey && primaryCategory) {
        const entry = categoryFacetAccumulator.get(
          derivedFields.primaryCategoryKey,
        ) ?? {
          key: derivedFields.primaryCategoryKey,
          label: primaryCategory,
          bookCount: 0,
        };
        entry.bookCount += 1;
        categoryFacetAccumulator.set(entry.key, entry);
      }

      bookSnapshotMap.set(
        book._id,
        buildLibraryFavoriteSnapshot({
          searchText: derivedFields.searchText,
          status: book.status,
          languageKey: derivedFields.languageKey,
          primaryCategoryKey: derivedFields.primaryCategoryKey,
        }),
      );

      const nextMembershipSnapshot = buildLibraryCollectionMembershipSnapshot({
        searchText: derivedFields.searchText,
        bookCreatedAt: book.createdAt,
      });
      const bookMemberships = membershipsByBookId.get(book._id) ?? [];

      for (const membership of bookMemberships) {
        if (
          membership.searchText === nextMembershipSnapshot.searchText &&
          membership.bookCreatedAt === nextMembershipSnapshot.bookCreatedAt
        ) {
          continue;
        }

        await ctx.db.patch(membership._id, nextMembershipSnapshot);
      }
    }

    for (const favorite of favorites) {
      const snapshot = bookSnapshotMap.get(favorite.bookId);
      if (!snapshot) {
        continue;
      }

      if (
        favorite.searchText === snapshot.searchText &&
        favorite.status === snapshot.status &&
        favorite.languageKey === snapshot.languageKey &&
        favorite.primaryCategoryKey === snapshot.primaryCategoryKey
      ) {
        continue;
      }

      await ctx.db.patch(favorite._id, snapshot);
    }

    const bookMap = new Map(books.map((book) => [book._id, book]));
    const ancestorCache = new Map<
      Id<"library_collections">,
      Id<"library_collections">[]
    >();
    const rollupAccumulator = new Map<
      string,
      {
        collectionId: Id<"library_collections">;
        bookId: Id<"library_books">;
        referenceCount: number;
        bookCreatedAt: number;
      }
    >();

    for (const membership of memberships) {
      const book = bookMap.get(membership.bookId);
      if (!book) {
        continue;
      }

      let ancestorIds = ancestorCache.get(membership.collectionId);
      if (!ancestorIds) {
        ancestorIds = await getCollectionAncestorIds(
          ctx,
          membership.collectionId,
        );
        ancestorCache.set(membership.collectionId, ancestorIds);
      }

      for (const ancestorId of ancestorIds) {
        const key = `${ancestorId}:${membership.bookId}`;
        const current = rollupAccumulator.get(key);

        if (current) {
          current.referenceCount += 1;
          continue;
        }

        rollupAccumulator.set(key, {
          collectionId: ancestorId,
          bookId: membership.bookId,
          referenceCount: 1,
          bookCreatedAt: book.createdAt,
        });
      }
    }

    let rebuiltRollups = 0;
    const collectionCounts = new Map<Id<"library_collections">, number>();
    const now = Date.now();

    for (const rollup of rollupAccumulator.values()) {
      await ctx.db.insert("library_collection_book_rollups", {
        collectionId: rollup.collectionId,
        bookId: rollup.bookId,
        referenceCount: rollup.referenceCount,
        bookCreatedAt: rollup.bookCreatedAt,
        updatedAt: now,
      });
      rebuiltRollups += 1;
      collectionCounts.set(
        rollup.collectionId,
        (collectionCounts.get(rollup.collectionId) ?? 0) + 1,
      );
    }

    let updatedCollections = 0;
    for (const collection of collections) {
      const nextBookCount = collectionCounts.get(collection._id) ?? 0;
      if (collection.bookCount === nextBookCount) {
        continue;
      }

      await ctx.db.patch(collection._id, {
        bookCount: nextBookCount,
      });
      updatedCollections += 1;
    }

    await rebuildFacetTable({
      ctx,
      table: "library_language_facets",
      entries: Array.from(languageFacetAccumulator.values()),
    });
    await rebuildFacetTable({
      ctx,
      table: "library_primary_category_facets",
      entries: Array.from(categoryFacetAccumulator.values()),
    });

    return {
      updatedBooks,
      updatedCollections,
      rebuiltRollups,
    };
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

export const getLibraryCatalogFilterOptions = query({
  args: {},
  returns: libraryCatalogFilterOptionsValidator,
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) {
      return {
        languages: [],
        categories: [],
      };
    }

    const [languageFacets, categoryFacets] = await Promise.all([
      ctx.db.query("library_language_facets").collect(),
      ctx.db.query("library_primary_category_facets").collect(),
    ]);

    return buildLibraryCatalogFilterOptionsFromFacets({
      languageFacets,
      categoryFacets,
    });
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
      };
    }

    const currentCollection = args.collectionId
      ? await ctx.db.get(args.collectionId)
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
          ? ((await ctx.db.get(cursor.parentId)) ?? undefined)
          : undefined;
      }
      breadcrumbs.reverse();
    }

    const currentDepth = currentCollection ? breadcrumbs.length - 1 : -1;
    const childCollections = await ctx.db
      .query("library_collections")
      .withIndex("by_parent_id_and_created_at", (q) =>
        q.eq("parentId", args.collectionId),
      )
      .collect();
    childCollections.sort(compareCollectionsByName);

    const browserChildCollections = await Promise.all(
      childCollections.map(async (collection) => {
        return {
          id: collection._id,
          name: collection.name,
          parentId: collection.parentId,
          depth: currentDepth + 1,
          bookCount: collection.bookCount ?? 0,
          previewBooks: await loadCollectionPreviewBooks(ctx, collection._id),
        };
      }),
    );

    return {
      currentCollection: currentCollection
        ? {
            id: currentCollection._id,
            name: currentCollection.name,
          }
        : undefined,
      breadcrumbs,
      childCollections: browserChildCollections,
    };
  },
});

export const getLibraryCollectionBooksPage = query({
  args: {
    collectionId: v.id("library_collections"),
    search: v.optional(v.string()),
    paginationOpts: paginationOptsValidator,
  },
  returns: paginatedLibraryBookListItemValidator,
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) {
      return {
        page: [],
        isDone: true,
        continueCursor: args.paginationOpts.cursor ?? "",
        splitCursor: null,
        pageStatus: null,
      };
    }

    const existingCollection = await ctx.db.get(args.collectionId);
    if (!existingCollection) {
      return {
        page: [],
        isDone: true,
        continueCursor: args.paginationOpts.cursor ?? "",
        splitCursor: null,
        pageStatus: null,
      };
    }

    const normalizedSearch = normalizeOptionalString(args.search);
    const pageResult = normalizedSearch
      ? await ctx.db
          .query("library_book_collections")
          .withSearchIndex("search_text", (q) =>
            q
              .search("searchText", normalizedSearch)
              .eq("collectionId", args.collectionId),
          )
          .paginate(args.paginationOpts)
      : await ctx.db
          .query("library_book_collections")
          .withIndex("by_collection_id_and_book_created_at", (q) =>
            q.eq("collectionId", args.collectionId),
          )
          .order("desc")
          .paginate(withLibraryCatalogPaginationBudget(args.paginationOpts));

    const books = (
      await Promise.all(
        pageResult.page.map((membership) => ctx.db.get(membership.bookId)),
      )
    ).filter((book): book is Doc<"library_books"> => Boolean(book));

    return await buildPaginatedLibraryBooksPage({
      ctx,
      userId: user._id,
      books,
      pageResult,
    });
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

    const now = Date.now();
    const bookFields = buildLibraryCatalogWriteFields({
      fileName: args.fileName,
      fileSizeBytes: args.fileSizeBytes,
      status: args.status,
      confidence: args.confidence,
      metadata: args.metadata,
      extractionWarnings: args.extractionWarnings,
    });

    const bookId = await ctx.db.insert("library_books", {
      storageId: args.storageId,
      ...bookFields,
      createdBy: user._id,
      createdAt: now,
      updatedAt: now,
    });

    await syncLibraryBookFacets({
      ctx,
      nextLanguage: bookFields.language,
      nextPrimaryCategory: getPrimaryCategoryValue(bookFields.categories),
    });

    await syncBookCollections({
      ctx,
      bookId,
      bookCreatedAt: now,
      bookSearchText: bookFields.searchText,
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
    const nextBookFields = buildLibraryCatalogWriteFields({
      fileName: replacementFileName ?? existingBook.fileName,
      fileSizeBytes: replacementFileSizeBytes ?? existingBook.fileSizeBytes,
      status: normalizedStatus,
      confidence: existingBook.confidence,
      metadata: args.metadata,
      extractionWarnings:
        args.extractionWarnings ?? existingBook.extractionWarnings,
    });
    const updatedAt = Date.now();

    await ctx.db.patch(args.bookId, {
      ...nextBookFields,
      storageId: replacementStorageId ?? existingBook.storageId,
      updatedAt,
    });

    await syncLibraryBookFacets({
      ctx,
      previousLanguage: existingBook.language,
      nextLanguage: nextBookFields.language,
      previousPrimaryCategory: getPrimaryCategoryValue(existingBook.categories),
      nextPrimaryCategory: getPrimaryCategoryValue(nextBookFields.categories),
    });
    await syncFavoriteSnapshotsForBook({
      ctx,
      bookId: args.bookId,
      snapshot: buildLibraryFavoriteSnapshot({
        searchText: nextBookFields.searchText,
        status: nextBookFields.status,
        languageKey: nextBookFields.languageKey,
        primaryCategoryKey: nextBookFields.primaryCategoryKey,
      }),
    });
    await syncCollectionMembershipSnapshotsForBook({
      ctx,
      bookId: args.bookId,
      snapshot: buildLibraryCollectionMembershipSnapshot({
        searchText: nextBookFields.searchText,
        bookCreatedAt: existingBook.createdAt,
      }),
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
      bookCreatedAt: existingBook.createdAt,
      bookSearchText: nextBookFields.searchText,
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

    await syncLibraryBookFacets({
      ctx,
      previousLanguage: existingBook.language,
      previousPrimaryCategory: getPrimaryCategoryValue(existingBook.categories),
    });

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

    const collectionIds = memberships.map(
      (membership) => membership.collectionId,
    );

    for (const membership of memberships) {
      await ctx.db.delete(membership._id);
    }

    await decrementCollectionRollups({
      ctx,
      bookId: args.bookId,
      collectionIds,
      updatedAt: Date.now(),
    });

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

    const derivedFields = buildLibraryBookDerivedFields({
      title: existingBook.title,
      subtitle: existingBook.subtitle,
      authors: existingBook.authors,
      publishers: existingBook.publishers,
      categories: existingBook.categories,
      isbn10: existingBook.isbn10,
      isbn13: existingBook.isbn13,
      fileName: existingBook.fileName,
      language: existingBook.language,
    });

    await ctx.db.insert("library_book_favorites", {
      userId: user._id,
      bookId: args.bookId,
      createdAt: Date.now(),
      ...buildLibraryFavoriteSnapshot({
        searchText: existingBook.searchText ?? derivedFields.searchText,
        status: existingBook.status,
        languageKey: existingBook.languageKey ?? derivedFields.languageKey,
        primaryCategoryKey:
          existingBook.primaryCategoryKey ?? derivedFields.primaryCategoryKey,
      }),
    });

    return true;
  },
});

export const getAllLibraryBooksPage = query({
  args: libraryCatalogPageArgsValidator,
  returns: paginatedLibraryBookListItemValidator,
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) {
      return {
        page: [],
        isDone: true,
        continueCursor: args.paginationOpts.cursor ?? "",
        splitCursor: null,
        pageStatus: null,
      };
    }

    const filters = normalizeLibraryCatalogFilters(args);

    if (filters.search) {
      const singleStatus = getSingleSelectedValue(filters.statuses);
      const singleLanguage = getSingleSelectedValue(filters.languages);
      const singleCategory = getSingleSelectedValue(filters.categories);

      const pageResult = await ctx.db
        .query("library_books")
        .withSearchIndex("search_text", (q) => {
          let searchQuery = q.search("searchText", filters.search!);

          if (singleStatus) {
            searchQuery = searchQuery.eq("status", singleStatus);
          }

          if (singleLanguage) {
            searchQuery = searchQuery.eq("languageKey", singleLanguage);
          }

          if (singleCategory) {
            searchQuery = searchQuery.eq("primaryCategoryKey", singleCategory);
          }

          return searchQuery;
        })
        .paginate(args.paginationOpts);

      const books = pageResult.page.filter((book) =>
        matchesLibraryCatalogFilters(book, filters),
      );

      return await buildPaginatedLibraryBooksPage({
        ctx,
        userId: user._id,
        books,
        pageResult,
      });
    }

    const allBooksBaseQuery = getAllBooksBaseQuery(ctx, filters);
    const allBooksFilterPredicate = buildLibraryCatalogFilterPredicate(filters);
    const pageResult = await (
      allBooksFilterPredicate
        ? allBooksBaseQuery.filter(allBooksFilterPredicate)
        : allBooksBaseQuery
    ).paginate(withLibraryCatalogPaginationBudget(args.paginationOpts));

    return await buildPaginatedLibraryBooksPage({
      ctx,
      userId: user._id,
      books: pageResult.page,
      pageResult,
    });
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

    const favoriteBookIds = await getFavoriteBookIdsForBooks({
      ctx,
      userId: user._id,
      bookIds: selectedBooks.map((book) => book._id),
    });

    return await Promise.all(
      selectedBooks.map((book) =>
        toLibraryBookListItem(ctx, book, {
          isFavorite: favoriteBookIds.has(book._id),
        }),
      ),
    );
  },
});

export const getMyLibraryBooksPage = query({
  args: libraryCatalogPageArgsValidator,
  returns: paginatedLibraryBookListItemValidator,
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) {
      return {
        page: [],
        isDone: true,
        continueCursor: args.paginationOpts.cursor ?? "",
        splitCursor: null,
        pageStatus: null,
      };
    }

    const filters = normalizeLibraryCatalogFilters(args);

    if (filters.search) {
      const singleStatus = getSingleSelectedValue(filters.statuses);
      const singleLanguage = getSingleSelectedValue(filters.languages);
      const singleCategory = getSingleSelectedValue(filters.categories);

      const pageResult = await ctx.db
        .query("library_book_favorites")
        .withSearchIndex("search_text", (q) => {
          let searchQuery = q
            .search("searchText", filters.search!)
            .eq("userId", user._id);

          if (singleStatus) {
            searchQuery = searchQuery.eq("status", singleStatus);
          }

          if (singleLanguage) {
            searchQuery = searchQuery.eq("languageKey", singleLanguage);
          }

          if (singleCategory) {
            searchQuery = searchQuery.eq("primaryCategoryKey", singleCategory);
          }

          return searchQuery;
        })
        .paginate(args.paginationOpts);

      const filteredFavorites = pageResult.page.filter((favorite) =>
        matchesLibraryCatalogFilters(favorite, filters),
      );
      const books = (
        await Promise.all(
          filteredFavorites.map((favorite: Doc<"library_book_favorites">) =>
            ctx.db.get(favorite.bookId),
          ),
        )
      ).filter((book): book is Doc<"library_books"> => Boolean(book));

      return {
        ...pageResult,
        page: await Promise.all(
          books.map((book) =>
            toLibraryBookListItem(ctx, book, { isFavorite: true }),
          ),
        ),
      };
    }

    const favoriteBooksBaseQuery = getFavoriteBooksBaseQuery(
      ctx,
      user._id,
      filters,
    );
    const favoriteBooksFilterPredicate =
      buildLibraryCatalogFilterPredicate(filters);
    const pageResult = await (
      favoriteBooksFilterPredicate
        ? favoriteBooksBaseQuery.filter(favoriteBooksFilterPredicate)
        : favoriteBooksBaseQuery
    ).paginate(withLibraryCatalogPaginationBudget(args.paginationOpts));

    const books = (
      await Promise.all(
        pageResult.page.map((favorite: Doc<"library_book_favorites">) =>
          ctx.db.get(favorite.bookId),
        ),
      )
    ).filter((book): book is Doc<"library_books"> => Boolean(book));

    return {
      ...pageResult,
      page: await Promise.all(
        books.map((book) =>
          toLibraryBookListItem(ctx, book, { isFavorite: true }),
        ),
      ),
    };
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
      includeHref: true,
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
