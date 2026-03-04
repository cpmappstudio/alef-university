# Books Metadata Pipeline

## Objective
Extract rich metadata from large PDF collections with a staged approach that avoids overengineering and controls cost.

## Current implementation (Phase 1)
Script: `scripts/extract-books-metadata.ts`

Steps:
1. Local extraction:
   - Filename parsing.
   - PDF info dictionary parsing (`Title`, `Author`, `Subject`, `CreationDate`, etc.).
   - Binary ISBN detection.
2. Optional catalog enrichment:
   - Open Library.
   - Google Books.
3. Merge and confidence:
   - Field-level selection by source quality and match type.
   - Status assignment: `ok`, `needs_review`, `failed`.
4. OpenAI fallback (optional):
   - Runs only on `needs_review`/`failed`.
   - Uses structured output.
   - Sends sampled pages (not the entire PDF) to reduce cost and context issues.
   - Retries with a stronger model and smaller sample if context window errors appear.
5. Outputs:
   - JSONL with detailed metadata + diagnostics.
   - JSON report with summary and top review candidates.

## Run examples
```bash
pnpm extract-books-metadata
pnpm extract-books-metadata -- --input public/books/sample --dry-run
pnpm extract-books-metadata -- --input public/books --concurrency 8
pnpm extract-books-metadata -- --input public/books/sample --openai
```

## Required environment variables
- `GOOGLE_BOOKS_API_KEY` (recommended)
- `OPENAI_API_KEY` (required only if using `--openai`)

## Output files
- `public/data/books_metadata.jsonl`
- `public/data/books_metadata.report.json`

## Next phases
Phase 2 (recommended for scanned PDFs at scale):
- Add dedicated OCR pipeline (OCRmyPDF/Tesseract or managed OCR) before OpenAI.
- Keep OCR stage isolated from deterministic extraction stage.
- If using OpenAI fallback directly on PDFs, prefer a large-context model such as `gpt-4.1-mini`.

Phase 3:
- LLM normalization/categorization with strict schema and confidence gating.
- Human review queue for low-confidence records.
