import { PDFDocument } from "pdf-lib";
import type { MetadataCandidate } from "./types";

const OPENAI_RESPONSES_API_URL = "https://api.openai.com/v1/responses";
const OPENAI_FILES_API_URL = "https://api.openai.com/v1/files";
const OPENAI_MAX_FILE_BYTES = 50 * 1024 * 1024;
const OPENAI_DEFAULT_SAMPLE_MAX_PAGES = 12;

type OpenAIExtractionResult = {
  candidate: MetadataCandidate | null;
  warnings: string[];
};

type OpenAIResponseJson = {
  output_text?: string;
  output?: Array<{
    content?: Array<{
      type?: string;
      text?: string;
    }>;
  }>;
  error?: {
    message?: string;
  };
};

type OpenAIFileUploadResponse = {
  id?: string;
  error?: {
    message?: string;
  };
};

type OpenAIMetadataPayload = {
  title: string | null;
  subtitle: string | null;
  authors: string[];
  publishers: string[];
  publishedYear: number | null;
  edition: string | null;
  isbn10: string | null;
  isbn13: string | null;
  abstract: string | null;
  language: string | null;
  categories: string[];
  confidence: number;
  notes: string | null;
};

type OpenAISingleAttemptResult = {
  candidate: MetadataCandidate | null;
  warnings: string[];
};

function hasContextWindowWarning(warnings: string[]): boolean {
  return warnings.some((warning) => {
    const normalized = warning.toLowerCase();
    return (
      normalized.includes("context window") ||
      normalized.includes("exceeds the context window")
    );
  });
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function uniqueStrings(values: string[]): string[] {
  const seen = new Set<string>();
  const output: string[] = [];

  for (const raw of values) {
    const value = normalizeWhitespace(raw);
    if (!value) {
      continue;
    }

    const key = value.toLowerCase();
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    output.push(value);
  }

  return output;
}

function buildSamplePageIndices(
  totalPages: number,
  maxPages: number,
): number[] {
  if (totalPages <= 0) {
    return [];
  }

  if (maxPages <= 0) {
    return [0];
  }

  if (totalPages <= maxPages) {
    return Array.from({ length: totalPages }, (_, index) => index);
  }

  const indices = new Set<number>();
  const frontPages = Math.min(8, maxPages, totalPages);
  for (let i = 0; i < frontPages; i += 1) {
    indices.add(i);
  }

  const remainingAfterFront = maxPages - indices.size;
  const backPages = Math.min(2, remainingAfterFront, totalPages - indices.size);
  for (let i = 0; i < backPages; i += 1) {
    indices.add(totalPages - 1 - i);
  }

  const remaining = maxPages - indices.size;
  const middleStart = frontPages;
  const middleEnd = totalPages - backPages - 1;

  if (remaining > 0 && middleEnd >= middleStart) {
    const span = middleEnd - middleStart + 1;
    for (let i = 1; i <= remaining; i += 1) {
      const ratio = i / (remaining + 1);
      const offset = Math.floor(ratio * span);
      const candidate = Math.min(middleEnd, middleStart + offset);
      indices.add(candidate);
    }
  }

  // If rounding duplicates reduced the set, fill with sequential middle pages.
  if (indices.size < maxPages) {
    for (
      let i = middleStart;
      i <= middleEnd && indices.size < maxPages;
      i += 1
    ) {
      indices.add(i);
    }
  }

  return [...indices].sort((a, b) => a - b);
}

async function preparePdfBufferForOpenAI(args: {
  fileBuffer: Buffer;
  sampleMaxPages: number;
}): Promise<{
  buffer: Buffer;
  sampled: boolean;
  warnings: string[];
}> {
  const warnings: string[] = [];
  const sampleMaxPages = Math.max(1, args.sampleMaxPages);

  try {
    const source = await PDFDocument.load(args.fileBuffer, {
      ignoreEncryption: true,
      throwOnInvalidObject: false,
      updateMetadata: false,
    });
    const pageCount = source.getPageCount();

    if (pageCount <= sampleMaxPages) {
      return {
        buffer: args.fileBuffer,
        sampled: false,
        warnings,
      };
    }

    const sampledIndices = buildSamplePageIndices(pageCount, sampleMaxPages);
    if (sampledIndices.length === 0) {
      warnings.push("Could not select pages for OpenAI sampling.");
      return {
        buffer: args.fileBuffer,
        sampled: false,
        warnings,
      };
    }

    const output = await PDFDocument.create();
    const copiedPages = await output.copyPages(source, sampledIndices);
    copiedPages.forEach((page) => output.addPage(page));
    const sampledBytes = await output.save();

    warnings.push(
      `OpenAI input sampled to ${sampledIndices.length} pages from ${pageCount} total pages.`,
    );

    return {
      buffer: Buffer.from(sampledBytes),
      sampled: true,
      warnings,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    warnings.push(
      `Unable to sample PDF pages for OpenAI input, using original file. (${message})`,
    );
    return {
      buffer: args.fileBuffer,
      sampled: false,
      warnings,
    };
  }
}

function parseResponseText(json: OpenAIResponseJson): string | null {
  if (
    typeof json.output_text === "string" &&
    json.output_text.trim().length > 0
  ) {
    return json.output_text.trim();
  }

  for (const item of json.output ?? []) {
    for (const content of item.content ?? []) {
      if (typeof content.text === "string" && content.text.trim().length > 0) {
        return content.text.trim();
      }
    }
  }

  return null;
}

function toPayload(raw: string): OpenAIMetadataPayload | null {
  try {
    return JSON.parse(raw) as OpenAIMetadataPayload;
  } catch {
    return null;
  }
}

function clampConfidence(value: number | null | undefined): number {
  const parsed =
    typeof value === "number" && Number.isFinite(value) ? value : 0.6;
  return Math.max(0, Math.min(1, parsed));
}

function detectAbstractLanguage(value?: string): "en" | "es" | null {
  if (!value) {
    return null;
  }

  const tokens = normalizeWhitespace(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .split(/[^a-z]+/i)
    .filter((token) => token.length >= 2);

  if (tokens.length < 12) {
    return null;
  }

  const englishMarkers = new Set([
    "the",
    "and",
    "that",
    "this",
    "with",
    "from",
    "written",
    "around",
    "even",
    "still",
    "whether",
    "which",
    "community",
    "study",
  ]);
  const spanishMarkers = new Set([
    "los",
    "las",
    "una",
    "del",
    "que",
    "con",
    "para",
    "por",
    "esta",
    "estos",
    "entre",
    "segunda",
    "investigacion",
    "metodologia",
  ]);

  let englishHits = 0;
  let spanishHits = 0;

  for (const token of tokens) {
    if (englishMarkers.has(token)) {
      englishHits += 1;
    }
    if (spanishMarkers.has(token)) {
      spanishHits += 1;
    }
  }

  if (englishHits >= spanishHits + 3 && englishHits >= 4) {
    return "en";
  }

  if (spanishHits >= englishHits + 3 && spanishHits >= 4) {
    return "es";
  }

  return null;
}

function sanitizePayload(
  payload: OpenAIMetadataPayload,
): OpenAIMetadataPayload {
  const normalizeComparableText = (value: string) =>
    normalizeWhitespace(value)
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  const stripWrappingPunctuation = (value: string) =>
    value
      .trim()
      .replace(/^[([{]\s*|\s*[)\]}]$/g, "")
      .trim();
  const looksLikeEditionStatement = (value?: string) => {
    if (!value) {
      return false;
    }

    const normalized = normalizeComparableText(stripWrappingPunctuation(value));
    return /(edition|revised|revise?d|edicion|edicion revisada|edicion corregida|ed\b|printing|impresion|reimpresion|\b\d+(st|nd|rd|th)\b|\b\d+\s*ed\b)/.test(
      normalized,
    );
  };
  const looksLikeKeywordList = (value?: string) => {
    if (!value) {
      return false;
    }

    const normalized = normalizeWhitespace(value);
    if (!normalized || /[.!?]/.test(normalized)) {
      return false;
    }

    const segments = normalized.split(/\s*,\s*/).filter(Boolean);
    return (
      segments.length >= 4 &&
      segments.every((segment) => segment.split(/\s+/).length <= 5)
    );
  };

  const normalizedYear =
    typeof payload.publishedYear === "number" &&
    payload.publishedYear >= 1600 &&
    payload.publishedYear <= 2100
      ? Math.trunc(payload.publishedYear)
      : null;

  const title = payload.title ? normalizeWhitespace(payload.title) : null;
  let subtitle = payload.subtitle
    ? normalizeWhitespace(payload.subtitle)
    : null;
  let edition = payload.edition ? normalizeWhitespace(payload.edition) : null;
  let abstract = payload.abstract
    ? normalizeWhitespace(payload.abstract)
    : null;

  if (subtitle && looksLikeEditionStatement(subtitle)) {
    if (!edition) {
      edition = stripWrappingPunctuation(subtitle);
    }
    subtitle = null;
  }

  if (abstract && looksLikeKeywordList(abstract)) {
    abstract = null;
  }

  const normalizedLanguage = payload.language
    ? normalizeWhitespace(payload.language).toLowerCase()
    : null;
  const abstractLanguage = detectAbstractLanguage(abstract ?? undefined);
  if (
    abstract &&
    abstractLanguage &&
    normalizedLanguage &&
    (normalizedLanguage === "es" || normalizedLanguage === "en") &&
    abstractLanguage !== normalizedLanguage
  ) {
    abstract = null;
  }

  return {
    title,
    subtitle,
    authors: uniqueStrings(payload.authors ?? []),
    publishers: uniqueStrings(payload.publishers ?? []),
    publishedYear: normalizedYear,
    edition,
    isbn10: payload.isbn10
      ? payload.isbn10.replace(/[^0-9Xx]/g, "").toUpperCase()
      : null,
    isbn13: payload.isbn13 ? payload.isbn13.replace(/[^0-9]/g, "") : null,
    abstract,
    language: normalizedLanguage,
    categories: uniqueStrings(payload.categories ?? []),
    confidence: clampConfidence(payload.confidence),
    notes: payload.notes ? normalizeWhitespace(payload.notes) : null,
  };
}

function hasCandidateData(candidate: MetadataCandidate | null): boolean {
  if (!candidate) {
    return false;
  }

  const metadata = candidate.metadata;
  return Boolean(
    metadata.title ||
      metadata.subtitle ||
      metadata.authors?.length ||
      metadata.publishers?.length ||
      metadata.publishedYear ||
      metadata.edition ||
      metadata.isbn10 ||
      metadata.isbn13 ||
      metadata.abstract ||
      metadata.language ||
      metadata.categories?.length,
  );
}

function hasUnreadablePdfWarning(warnings: string[]): boolean {
  const unreadableSignals = [
    "could not be read",
    "no content",
    "no bibliographic metadata extracted",
  ];

  return warnings.some((warning) => {
    const normalized = warning.toLowerCase();
    return unreadableSignals.some((signal) => normalized.includes(signal));
  });
}

function buildRequestBody(args: {
  fileId: string;
  model: string;
}): Record<string, unknown> {
  const schema = {
    type: "object",
    additionalProperties: false,
    properties: {
      title: { type: ["string", "null"] },
      subtitle: { type: ["string", "null"] },
      authors: { type: "array", items: { type: "string" } },
      publishers: { type: "array", items: { type: "string" } },
      publishedYear: { type: ["integer", "null"] },
      edition: { type: ["string", "null"] },
      isbn10: { type: ["string", "null"] },
      isbn13: { type: ["string", "null"] },
      abstract: { type: ["string", "null"] },
      language: { type: ["string", "null"] },
      categories: { type: "array", items: { type: "string" } },
      confidence: { type: "number" },
      notes: { type: ["string", "null"] },
    },
    required: [
      "title",
      "subtitle",
      "authors",
      "publishers",
      "publishedYear",
      "edition",
      "isbn10",
      "isbn13",
      "abstract",
      "language",
      "categories",
      "confidence",
      "notes",
    ],
  };

  const prompt = [
    "Extract bibliographic metadata from this PDF content.",
    "Rules:",
    "- Use only evidence from the PDF content.",
    "- The file may contain only selected pages; never infer hidden pages.",
    "- Do not invent missing fields.",
    "- If unknown, return null (or [] for arrays).",
    "- Keep title/subtitle/authors/publishers in the original document language. Never translate proper nouns.",
    "- Subtitle must exclude edition/revision statements. If the cover shows 'Title', then a secondary phrase, then '(Second Revised Edition)', the secondary phrase is subtitle and the parenthesized phrase is edition.",
    "- If the title line already contains a colon, keep the main title and subtitle separated conceptually: title before the colon, subtitle after the colon, unless the text after the colon is itself only an edition statement.",
    "- Keep abstract and categories in the same language as the source pages. Do not translate to English unless the source is English.",
    "- Only return an abstract when the PDF explicitly contains summary-like prose. Never use subject headings, keyword lists, tables of contents, or comma-separated topic lists as abstract.",
    "- For edition, extract the exact edition phrase when present (e.g., '1ª edición, noviembre 2005', 'Second edition').",
    "- If multiple ISBNs appear, return only the ISBN for the current edition shown in the PDF. Ignore ISBNs explicitly marked as previous, earlier, prior, or old editions. If unclear, return null.",
    "- For categories, use concise domain labels from the document language (max 5).",
    "- Keep abstract concise (max 1200 chars).",
    "- For language, return ISO-639-1 when possible (e.g., en, es).",
    "- Confidence must be 0..1 and reflect certainty of the overall extraction.",
  ].join("\n");

  const requestBody: Record<string, unknown> = {
    model: args.model,
    input: [
      {
        role: "user",
        content: [
          {
            type: "input_file",
            file_id: args.fileId,
          },
          {
            type: "input_text",
            text: prompt,
          },
        ],
      },
    ],
    text: {
      format: {
        type: "json_schema",
        name: "book_metadata_extraction",
        strict: true,
        schema,
      },
    },
  };

  if (!args.model.startsWith("gpt-5")) {
    requestBody.temperature = 0;
  }

  return requestBody;
}

async function uploadPdfToOpenAI(args: {
  apiKey: string;
  fileName: string;
  fileBuffer: Buffer;
  timeoutMs: number;
}): Promise<{ fileId: string | null; warning?: string }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), args.timeoutMs);

  try {
    const bytes = Uint8Array.from(args.fileBuffer);
    const formData = new FormData();
    formData.append("purpose", "user_data");
    formData.append(
      "file",
      new Blob([bytes], { type: "application/pdf" }),
      args.fileName,
    );

    const response = await fetch(OPENAI_FILES_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${args.apiKey}`,
      },
      body: formData,
      signal: controller.signal,
    });

    const json = (await response.json()) as OpenAIFileUploadResponse;
    if (!response.ok || !json.id) {
      return {
        fileId: null,
        warning: `OpenAI file upload failed: ${json.error?.message ?? response.statusText}`,
      };
    }

    return { fileId: json.id };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return {
      fileId: null,
      warning: `OpenAI file upload error: ${message}`,
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function deleteUploadedFile(
  apiKey: string,
  fileId: string,
): Promise<void> {
  try {
    await fetch(`${OPENAI_FILES_API_URL}/${fileId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });
  } catch {
    // Best-effort cleanup.
  }
}

async function extractMetadataFromBuffer(args: {
  apiKey: string;
  fileName: string;
  fileBuffer: Buffer;
  model: string;
  timeoutMs: number;
}): Promise<OpenAISingleAttemptResult> {
  const warnings: string[] = [];
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), args.timeoutMs);
  let uploadedFileId: string | null = null;

  try {
    const uploaded = await uploadPdfToOpenAI({
      apiKey: args.apiKey,
      fileName: args.fileName,
      fileBuffer: args.fileBuffer,
      timeoutMs: args.timeoutMs,
    });

    if (!uploaded.fileId) {
      if (uploaded.warning) {
        warnings.push(uploaded.warning);
      }
      return { candidate: null, warnings };
    }

    uploadedFileId = uploaded.fileId;
    const requestBody = buildRequestBody({
      fileId: uploaded.fileId,
      model: args.model,
    });

    const response = await fetch(OPENAI_RESPONSES_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${args.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    const json = (await response.json()) as OpenAIResponseJson;
    if (!response.ok) {
      const message = json.error?.message ?? response.statusText;
      if (message.toLowerCase().includes("context window")) {
        warnings.push("OpenAI context window limit reached.");
      }
      warnings.push(`OpenAI request failed: ${message}`);
      return { candidate: null, warnings };
    }

    const rawText = parseResponseText(json);
    if (!rawText) {
      warnings.push("OpenAI response had no parsable text payload.");
      return { candidate: null, warnings };
    }

    const payload = toPayload(rawText);
    if (!payload) {
      warnings.push("OpenAI response JSON could not be parsed.");
      return { candidate: null, warnings };
    }

    const cleaned = sanitizePayload(payload);
    const candidate: MetadataCandidate = {
      source: "openai",
      confidence: cleaned.confidence,
      metadata: {
        title: cleaned.title ?? undefined,
        subtitle: cleaned.subtitle ?? undefined,
        authors: cleaned.authors.length > 0 ? cleaned.authors : undefined,
        publishers:
          cleaned.publishers.length > 0 ? cleaned.publishers : undefined,
        publishedYear: cleaned.publishedYear ?? undefined,
        edition: cleaned.edition ?? undefined,
        isbn10: cleaned.isbn10 ?? undefined,
        isbn13: cleaned.isbn13 ?? undefined,
        abstract: cleaned.abstract ?? undefined,
        language: cleaned.language ?? undefined,
        categories:
          cleaned.categories.length > 0 ? cleaned.categories : undefined,
      },
    };

    if (cleaned.notes) {
      warnings.push(`OpenAI note: ${cleaned.notes}`);
    }

    return { candidate, warnings };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    warnings.push(`OpenAI extraction error: ${message}`);
    return { candidate: null, warnings };
  } finally {
    clearTimeout(timeout);
    if (uploadedFileId) {
      await deleteUploadedFile(args.apiKey, uploadedFileId);
    }
  }
}

export async function extractMetadataWithOpenAI(args: {
  fileName: string;
  fileBuffer: Buffer;
  model: string;
  timeoutMs: number;
  sampleMaxPages?: number;
}): Promise<OpenAIExtractionResult> {
  const warnings: string[] = [];
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    warnings.push("OPENAI_API_KEY is not configured.");
    return { candidate: null, warnings };
  }

  const sampledInput = await preparePdfBufferForOpenAI({
    fileBuffer: args.fileBuffer,
    sampleMaxPages: args.sampleMaxPages ?? OPENAI_DEFAULT_SAMPLE_MAX_PAGES,
  });
  warnings.push(...sampledInput.warnings);

  if (sampledInput.buffer.byteLength > OPENAI_MAX_FILE_BYTES) {
    warnings.push(
      "PDF size exceeds OpenAI 50MB per-file limit even after sampling.",
    );
    return { candidate: null, warnings };
  }
  const sampledAttempt = await extractMetadataFromBuffer({
    apiKey,
    fileName: args.fileName,
    fileBuffer: sampledInput.buffer,
    model: args.model,
    timeoutMs: args.timeoutMs,
  });
  warnings.push(...sampledAttempt.warnings);

  const shouldRetryWithoutSampling =
    sampledInput.sampled &&
    args.fileBuffer.byteLength <= OPENAI_MAX_FILE_BYTES &&
    !hasContextWindowWarning(sampledAttempt.warnings) &&
    (hasUnreadablePdfWarning(sampledAttempt.warnings) ||
      !hasCandidateData(sampledAttempt.candidate));

  if (!shouldRetryWithoutSampling) {
    return { candidate: sampledAttempt.candidate, warnings };
  }

  warnings.push(
    "OpenAI sampled PDF appeared unreadable; retrying once with the full PDF.",
  );

  const fullAttempt = await extractMetadataFromBuffer({
    apiKey,
    fileName: args.fileName,
    fileBuffer: args.fileBuffer,
    model: args.model,
    timeoutMs: args.timeoutMs,
  });
  warnings.push(...fullAttempt.warnings);

  return {
    candidate: hasCandidateData(fullAttempt.candidate)
      ? fullAttempt.candidate
      : sampledAttempt.candidate,
    warnings,
  };
}
