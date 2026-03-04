export type MetadataSource =
  | "filename"
  | "pdf_info"
  | "pdf_binary"
  | "openlibrary"
  | "google_books"
  | "openai";

export type MatchType = "isbn" | "query";

export type CandidateMetadata = {
  title?: string;
  subtitle?: string;
  authors?: string[];
  publishers?: string[];
  publishedYear?: number;
  edition?: string;
  isbn10?: string;
  isbn13?: string;
  abstract?: string;
  language?: string;
  categories?: string[];
};

export type MetadataCandidate = {
  source: MetadataSource;
  confidence: number;
  matchedBy?: MatchType;
  metadata: CandidateMetadata;
};

export type SourceEvidence = {
  source: MetadataSource;
  field: keyof CandidateMetadata;
  value: string | number | string[] | undefined;
  confidence: number;
  note?: string;
};

export type BookMetadataResult = {
  filePath: string;
  fileName: string;
  fileSizeBytes: number;
  status: "ok" | "needs_review" | "failed";
  confidence: number;
  metadata: CandidateMetadata;
  missingFields: Array<keyof CandidateMetadata>;
  evidence: SourceEvidence[];
  diagnostics: {
    extractedIsbns: string[];
    usedIsbn?: string;
    warnings: string[];
  };
};

export type LocalExtractionResult = {
  candidate: MetadataCandidate;
  extractedIsbns: string[];
  warnings: string[];
};
