import { readFile } from "node:fs/promises";
import path from "node:path";

import { parseLibraryBooksJsonl } from "@/lib/library/parser";
import type { LibraryBookRecord } from "@/lib/library/types";

const DEFAULT_LIBRARY_METADATA_FILE = path.join(
  process.cwd(),
  "public/data/books_metadata.jsonl",
);

export async function loadLibraryBooks(
  filePath = DEFAULT_LIBRARY_METADATA_FILE,
): Promise<LibraryBookRecord[]> {
  try {
    const content = await readFile(filePath, "utf8");
    return parseLibraryBooksJsonl(content);
  } catch (error) {
    console.warn("[library] Unable to load metadata file:", error);
    return [];
  }
}
