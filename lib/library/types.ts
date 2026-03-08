import type {
  BookMetadataResult,
  CandidateMetadata,
} from "@/lib/books-metadata/types";

export type LibraryBookStatus = BookMetadataResult["status"];

export type LibraryScope = "all" | "my";

export type LibraryBookRecord = {
  id: string;
  fileName: string;
  filePath?: string;
  fileSizeBytes?: number;
  isFavorite?: boolean;
  status: LibraryBookStatus;
  confidence: number;
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
  collectionIds?: string[];
  href?: string;
  coverUrl?: string;
  extractionWarnings?: string[];
};

export type LibraryBookDetailRecord = LibraryBookRecord & {
  createdAt: number;
  updatedAt?: number;
};

export type LibraryCollectionPreviewBook = Pick<
  LibraryBookRecord,
  "id" | "title" | "coverUrl"
>;

export type LibraryCollectionRecord = {
  id: string;
  name: string;
  parentId?: string;
  depth: number;
  bookCount: number;
  previewBooks: LibraryCollectionPreviewBook[];
};

export type LibraryCollectionTreeNode = {
  id: string;
  name: string;
  parentId?: string;
  depth: number;
};

export type LibraryCollectionBreadcrumb = {
  id: string;
  name: string;
};

export type LibraryCollectionBookOption = Pick<
  LibraryBookRecord,
  "id" | "title" | "authors"
> & {
  isAssigned: boolean;
};

export type LibraryCollectionBrowserRecord = {
  currentCollection?: LibraryCollectionBreadcrumb;
  breadcrumbs: LibraryCollectionBreadcrumb[];
  childCollections: LibraryCollectionRecord[];
  books: LibraryBookRecord[];
};

export type LibraryRawMetadataRecord = Partial<BookMetadataResult> & {
  metadata?: Partial<CandidateMetadata>;
};

export type LibraryCatalogClientProps = {
  books: LibraryBookRecord[];
  scope: LibraryScope;
  initialCollectionBrowser?: LibraryCollectionBrowserRecord;
};
