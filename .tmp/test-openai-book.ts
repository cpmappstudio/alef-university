import { readFile } from "node:fs/promises";
import path from "node:path";
import util from "node:util";
import { extractBookMetadataWithFallback } from "../lib/books-metadata/service";

async function main() {
  const filePath = path.resolve("public/books/sample/Homiletics.pdf");
  const fileBuffer = await readFile(filePath);
  const result = await extractBookMetadataWithFallback({
    fileBuffer,
    fileName: path.basename(filePath),
    includeOpenAI: true,
    openAIModel: "gpt-5-mini",
    openAITimeoutMs: 180000,
  });
  console.log(util.inspect(result, { depth: null, colors: false }));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
