/**
 * Script to convert courses.xlsx to courses.jsonl
 *
 * Usage:
 *   npx tsx scripts/excel-to-jsonl.ts
 *
 * Input: public/data/courses.xlsx
 * Output: public/data/courses.jsonl
 */

import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

type CourseJSONLExport = {
  language: "es" | "en";
  category: "humanities" | "core" | "elective" | "general";
  credits: number;
  isActive: boolean;
  programCodes?: string[];
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
  programCode: string;
  codeEs: string;
  codeEn: string;
  nameEs: string;
  nameEn: string;
  descriptionEs: string;
  descriptionEn: string;
  credits: number;
  isActive: boolean | string;
};

function convertExcelToJSONL() {
  const inputPath = path.join(process.cwd(), 'public', 'data', 'courses.xlsx');
  const outputPath = path.join(process.cwd(), 'public', 'data', 'courses.jsonl');

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
      if (language !== 'es' && language !== 'en') {
        errors.push(`Line ${lineNumber}: Invalid language "${row.language}". Must be "es" or "en"`);
        skippedCount++;
        return;
      }

      // Validate category
      const category = row.category?.trim().toLowerCase();
      const validCategories = ['humanities', 'core', 'elective', 'general'];
      if (!validCategories.includes(category)) {
        errors.push(`Line ${lineNumber}: Invalid category "${row.category}". Must be one of: ${validCategories.join(', ')}`);
        skippedCount++;
        return;
      }

      // Parse isActive
      let isActive = true;
      if (typeof row.isActive === 'boolean') {
        isActive = row.isActive;
      } else if (typeof row.isActive === 'string') {
        const isActiveStr = row.isActive.trim().toLowerCase();
        isActive = isActiveStr === 'true' || isActiveStr === '1' || isActiveStr === 'yes' || isActiveStr === 'sí';
      }

      // Build JSONL object
      const data: CourseJSONLExport = {
        language: language as "es" | "en",
        category: category as "humanities" | "core" | "elective" | "general",
        credits: Number(row.credits),
        isActive,
      };

      // Add programCode as array if present
      if (row.programCode && row.programCode.trim()) {
        data.programCodes = [row.programCode.trim()];
      }

      // Add language-specific fields based on language
      if (language === 'es') {
        if (!row.codeEs || !row.nameEs || !row.descriptionEs) {
          errors.push(`Line ${lineNumber}: Missing Spanish fields (codeEs, nameEs, or descriptionEs) for Spanish course`);
          skippedCount++;
          return;
        }
        data.codeEs = row.codeEs.trim();
        data.nameEs = row.nameEs.trim();
        data.descriptionEs = row.descriptionEs.trim();
      } else if (language === 'en') {
        if (!row.codeEn || !row.nameEn || !row.descriptionEn) {
          errors.push(`Line ${lineNumber}: Missing English fields (codeEn, nameEn, or descriptionEn) for English course`);
          skippedCount++;
          return;
        }
        data.codeEn = row.codeEn.trim();
        data.nameEn = row.nameEn.trim();
        data.descriptionEn = row.descriptionEn.trim();
      }

      // Validate credits
      if (isNaN(data.credits) || data.credits <= 0) {
        errors.push(`Line ${lineNumber}: Invalid credits "${row.credits}". Must be a positive number`);
        skippedCount++;
        return;
      }

      // Convert to JSONL line
      jsonlLines.push(JSON.stringify(data));
      successCount++;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      errors.push(`Line ${lineNumber}: ${errorMessage}`);
      skippedCount++;
    }
  });

  // Write JSONL file
  const jsonlContent = jsonlLines.join('\n');
  fs.writeFileSync(outputPath, jsonlContent, 'utf-8');

  // Print summary
  console.log('\n📊 Conversion Summary:');
  console.log(`✅ Successfully converted: ${successCount} courses`);
  console.log(`❌ Skipped (errors): ${skippedCount} courses`);
  console.log(`📝 Output file: ${outputPath}`);

  if (errors.length > 0) {
    console.log('\n⚠️  Errors:');
    errors.forEach(error => console.log(`  - ${error}`));
  }

  if (successCount > 0) {
    console.log('\n✨ Conversion completed successfully!');
    console.log(`\nYou can now import the JSONL file using the course import dialog in the admin panel.`);
  } else {
    console.log('\n❌ No courses were converted. Please fix the errors above.');
    process.exit(1);
  }
}

// Run the conversion
try {
  convertExcelToJSONL();
} catch (error) {
  console.error('❌ Fatal error:', error);
  process.exit(1);
}
