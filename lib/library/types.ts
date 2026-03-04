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
  href?: string;
  coverUrl?: string;
  extractionWarnings?: string[];
};

export type LibraryBookDetailRecord = LibraryBookRecord & {
  createdAt: number;
  updatedAt?: number;
};

export type LibraryRawMetadataRecord = Partial<BookMetadataResult> & {
  metadata?: Partial<CandidateMetadata>;
};

export type LibraryCatalogClientProps = {
  books: LibraryBookRecord[];
  scope: LibraryScope;
};
