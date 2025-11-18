/**
 * Script to convert courses.xlsx to courses.jsonl
 *
 * Usage:
 *   npx tsx scripts/excel-to-jsonl.ts
 *
 * Input: public/data/courses.xlsx
 * Output: public/data/courses.jsonl
 *
 * Excel format:
 *   - programCodes: comma-separated list (e.g., "01D, 04D")
 *   - programCredits: colon-separated pairs (e.g., "01D:2, 04D:1")
 */

import * as XLSX from "xlsx";
import * as fs from "fs";
import * as path from "path";

type CourseJSONLExport = {
  language: "es" | "en";
  category: "humanities" | "core" | "elective" | "general";
  isActive: boolean;
  programCodes?: string[];
  programCredits?: Record<string, number>;
  codeEs?: string;
  nameEs?: string;
  descriptionEs?: string;
  codeEn?: string;
  nameEn?: string;
  descriptionEn?: string;
};

type ExcelRow = {
  language: string;
  category: string;
  programCodes: string | number;
  codeEs: string;
  codeEn: string;
  nameEs: string;
  nameEn: string;
  descriptionEs: string;
  descriptionEn: string;
  programCredits: string | number;
  isActive: boolean | string;
};

function parseProgramCodes(programCodesStr: string | number): string[] {
  if (!programCodesStr) {
    return [];
  }

  // Convert to string if it's a number
  const codesStr = String(programCodesStr).trim();
  if (!codesStr) {
    return [];
  }

  return codesStr
    .split(",")
    .map((code) => code.trim())
    .filter((code) => code.length > 0);
}

function parseProgramCredits(
  programCreditsStr: string | number,
  programCodes: string[],
): Record<string, number> {
  const result: Record<string, number> = {};

  if (!programCreditsStr) {
    return result;
  }

  // Convert to string if it's a number
  const creditsStr = String(programCreditsStr).trim();
  if (!creditsStr) {
    return result;
  }

  // Check if it's just a single number (for single program case)
  const singleNumber = Number(creditsStr);
  if (
    !isNaN(singleNumber) &&
    singleNumber > 0 &&
    !creditsStr.includes(":") &&
    !creditsStr.includes(",")
  ) {
    // Single number case: use first program code
    if (programCodes.length > 0) {
      result[programCodes[0]] = singleNumber;
      return result;
    }
  }

  // Parse multiple entries with format "01D:2, 04D:3"
  const pairs = creditsStr.split(",");
  for (const pair of pairs) {
    const trimmedPair = pair.trim();
    if (!trimmedPair) continue;

    const [code, creditsStr] = trimmedPair.split(":");
    if (!code || !creditsStr) {
      continue;
    }

    const trimmedCode = code.trim();
    const credits = Number(creditsStr.trim());

    if (trimmedCode && !isNaN(credits) && credits > 0) {
      result[trimmedCode] = credits;
    }
  }

  return result;
}

function convertExcelToJSONL() {
  const inputPath = path.join(process.cwd(), "public", "data", "courses.xlsx");
  const outputPath = path.join(
    process.cwd(),
    "public",
    "data",
    "courses.jsonl",
  );

  // Read Excel file
  console.log(`📖 Reading Excel file: ${inputPath}`);
  const workbook = XLSX.readFile(inputPath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  // Convert to JSON
  const rows: ExcelRow[] = XLSX.utils.sheet_to_json(worksheet);
  console.log(`✅ Found ${rows.length} rows in Excel`);

  const jsonlLines: string[] = [];
  const errors: string[] = [];
  let successCount = 0;
  let skippedCount = 0;

  // Process each row
  rows.forEach((row, index) => {
    const lineNumber = index + 2; // +2 because Excel is 1-indexed and has header row

    try {
      // Validate language
      const language = row.language?.trim().toLowerCase();
      if (language !== "es" && language !== "en") {
        errors.push(
          `Line ${lineNumber}: Invalid language "${row.language}". Must be "es" or "en"`,
        );
        skippedCount++;
        return;
      }

      // Validate category
      const category = row.category?.trim().toLowerCase();
      const validCategories = ["humanities", "core", "elective", "general"];
      if (!validCategories.includes(category)) {
        errors.push(
          `Line ${lineNumber}: Invalid category "${row.category}". Must be one of: ${validCategories.join(", ")}`,
        );
        skippedCount++;
        return;
      }

      // Parse isActive
      let isActive = true;
      if (typeof row.isActive === "boolean") {
        isActive = row.isActive;
      } else if (typeof row.isActive === "string") {
        const isActiveStr = row.isActive.trim().toLowerCase();
        isActive =
          isActiveStr === "true" ||
          isActiveStr === "1" ||
          isActiveStr === "yes" ||
          isActiveStr === "sí";
      }

      // Parse programCodes first
      const programCodes = parseProgramCodes(row.programCodes);

      // Parse programCredits (pass programCodes for single number case)
      const programCredits = parseProgramCredits(
        row.programCredits,
        programCodes,
      );

      // Validate that we have program credits
      if (Object.keys(programCredits).length === 0) {
        errors.push(
          `Line ${lineNumber}: No valid program credits found. Format should be "01D:2, 04D:3"`,
        );
        skippedCount++;
        return;
      }

      // Build JSONL object
      const data: CourseJSONLExport = {
        language: language as "es" | "en",
        category: category as "humanities" | "core" | "elective" | "general",
        isActive,
        programCredits,
      };

      // Add programCodes if present (optional, for backwards compatibility)
      if (programCodes.length > 0) {
        data.programCodes = programCodes;
      }

      // Add language-specific fields based on language
      if (language === "es") {
        if (!row.codeEs || !row.nameEs || !row.descriptionEs) {
          errors.push(
            `Line ${lineNumber}: Missing Spanish fields (codeEs, nameEs, or descriptionEs) for Spanish course`,
          );
          skippedCount++;
          return;
        }
        data.codeEs = row.codeEs.trim();
        data.nameEs = row.nameEs.trim();
        data.descriptionEs = row.descriptionEs.trim();
      } else if (language === "en") {
        if (!row.codeEn || !row.nameEn || !row.descriptionEn) {
          errors.push(
            `Line ${lineNumber}: Missing English fields (codeEn, nameEn, or descriptionEn) for English course`,
          );
          skippedCount++;
          return;
        }
        data.codeEn = row.codeEn.trim();
        data.nameEn = row.nameEn.trim();
        data.descriptionEn = row.descriptionEn.trim();
      }

      // Convert to JSONL line
      jsonlLines.push(JSON.stringify(data));
      successCount++;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      errors.push(`Line ${lineNumber}: ${errorMessage}`);
      skippedCount++;
    }
  });

  // Write JSONL file
  const jsonlContent = jsonlLines.join("\n");
  fs.writeFileSync(outputPath, jsonlContent, "utf-8");

  // Print summary
  console.log("\n📊 Conversion Summary:");
  console.log(`✅ Successfully converted: ${successCount} courses`);
  console.log(`❌ Skipped (errors): ${skippedCount} courses`);
  console.log(`📝 Output file: ${outputPath}`);

  if (errors.length > 0) {
    console.log("\n⚠️  Errors:");
    errors.forEach((error) => console.log(`  - ${error}`));
  }

  if (successCount > 0) {
    console.log("\n✨ Conversion completed successfully!");
    console.log("\n📄 Example output (first course):");
    if (jsonlLines.length > 0) {
      console.log(jsonlLines[0]);
    }
    console.log(
      "\nYou can now import the JSONL file using the course import dialog in the admin panel.",
    );
  } else {
    console.log("\n❌ No courses were converted. Please fix the errors above.");
    process.exit(1);
  }
}

// Run the conversion
try {
  convertExcelToJSONL();
} catch (error) {
  console.error("❌ Fatal error:", error);
  process.exit(1);
}
