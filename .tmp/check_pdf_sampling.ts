import fs from 'fs/promises';
import path from 'path';
import { PDFDocument } from 'pdf-lib';

function buildSamplePageIndices(totalPages:number, maxPages:number): number[] {
  if (totalPages <= 0) return [];
  if (maxPages <= 0) return [0];
  if (totalPages <= maxPages) return Array.from({ length: totalPages }, (_, i) => i);
  const indices = new Set<number>();
  const frontPages = Math.min(8, maxPages, totalPages);
  for (let i = 0; i < frontPages; i += 1) indices.add(i);
  const remainingAfterFront = maxPages - indices.size;
  const backPages = Math.min(2, remainingAfterFront, totalPages - indices.size);
  for (let i = 0; i < backPages; i += 1) indices.add(totalPages - 1 - i);
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
  if (indices.size < maxPages) {
    for (let i = middleStart; i <= middleEnd && indices.size < maxPages; i += 1) indices.add(i);
  }
  return [...indices].sort((a,b)=>a-b);
}

async function main() {
  const root = path.join(process.cwd(), 'public', 'books', 'Biblioteca Alef');
  const pdfs: Array<{path:string,size:number}> = [];
  async function walk(dir:string): Promise<void> {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) await walk(full);
      else if (e.isFile() && e.name.toLowerCase().endsWith('.pdf')) {
        pdfs.push({ path: full, size: (await fs.stat(full)).size });
      }
    }
  }
  await walk(root);
  const largest = pdfs.sort((a,b)=>b.size-a.size).slice(0,15);
  for (const item of largest) {
    const buf = await fs.readFile(item.path);
    const source = await PDFDocument.load(buf, { ignoreEncryption: true, throwOnInvalidObject: false, updateMetadata: false });
    const pageCount = source.getPageCount();
    const idx = buildSamplePageIndices(pageCount, 12);
    const out = await PDFDocument.create();
    const copied = await out.copyPages(source, idx);
    copied.forEach((p)=>out.addPage(p));
    const sampled = await out.save();
    console.log(JSON.stringify({
      file: path.relative(root, item.path),
      originalMB: Number((item.size/1024/1024).toFixed(2)),
      pages: pageCount,
      sampledPages: idx.length,
      sampledMB: Number((sampled.length/1024/1024).toFixed(2)),
      sampledOver50MB: sampled.length > 50*1024*1024,
    }));
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
