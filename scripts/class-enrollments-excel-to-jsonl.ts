/**
 * Script to convert class_enrollments.xlsx to class_enrollments.jsonl
 *
 * Usage:
 *   npx tsx scripts/class-enrollments-excel-to-jsonl.ts
 *
 * Input: public/data/class_enrollments.xlsx
 * Output: public/data/class_enrollments.jsonl
 *
 * Excel format:
 *   Columns: programId, courseId, professorName, studentId, percentageGrade, bimesterName, groupNumber
 *
 * This script groups rows by unique class (programId, courseId, bimesterName, groupNumber, professorEmail)
 * and creates a JSONL file where each line represents a class with its enrolled students.
 */

import * as XLSX from "xlsx";
import * as fs from "fs";
import * as path from "path";
import {
  groupEnrollmentsByClass,
  convertToJSONL,
} from "../lib/class-enrollments/utils";
import type { ClassEnrollmentExcelRow } from "../lib/class-enrollments/types";

// File paths
const INPUT_FILE = path.join(
  process.cwd(),
  "public",
  "data",
  "class_enrollments.xlsx",
);
const OUTPUT_FILE = path.join(
  process.cwd(),
  "public",
  "data",
  "class_enrollments.jsonl",
);

function main() {
  console.log("🔄 Converting class_enrollments.xlsx to JSONL...\n");

  // Check if input file exists
  if (!fs.existsSync(INPUT_FILE)) {
    console.error(`❌ Error: Input file not found at ${INPUT_FILE}`);
    process.exit(1);
  }

  try {
    // Read Excel file
    console.log("📖 Reading Excel file...");
    const workbook = XLSX.readFile(INPUT_FILE);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // Convert to JSON
    const rawData: any[] = XLSX.utils.sheet_to_json(worksheet);
    console.log(`✅ Found ${rawData.length} rows in Excel\n`);

    if (rawData.length === 0) {
      console.error("❌ Error: Excel file is empty");
      process.exit(1);
    }

    // Map Excel columns to our type
    const rows: ClassEnrollmentExcelRow[] = rawData.map((row) => {
      // Handle professorName or professorEmail column
      // The user mentioned professorEmail in the context but the original spec said professorName
      // We'll check for both
      const professorEmail =
        row.professorEmail || row.professorName || row.email || "";

      return {
        programId: String(row.programId || "").trim(),
        courseId: String(row.courseId || "").trim(),
        professorEmail: String(professorEmail).trim(),
        studentId: String(row.studentId || "").trim(),
        percentageGrade: Number(row.percentageGrade || 0),
        bimesterName: String(row.bimesterName || "").trim(),
        groupNumber: String(row.groupNumber || "").trim(),
      };
    });

    // Validate and filter out invalid rows
    const validRows = rows.filter((row) => {
      if (!row.programId) {
        console.warn(
          `⚠️  Skipping row with missing programId: ${JSON.stringify(row)}`,
        );
        return false;
      }
      if (!row.courseId) {
        console.warn(
          `⚠️  Skipping row with missing courseId: ${JSON.stringify(row)}`,
        );
        return false;
      }
      if (!row.studentId) {
        console.warn(
          `⚠️  Skipping row with missing studentId: ${JSON.stringify(row)}`,
        );
        return false;
      }
      if (!row.bimesterName) {
        console.warn(
          `⚠️  Skipping row with missing bimesterName: ${JSON.stringify(row)}`,
        );
        return false;
      }
      if (!row.groupNumber) {
        console.warn(
          `⚠️  Skipping row with missing groupNumber: ${JSON.stringify(row)}`,
        );
        return false;
      }
      if (!row.professorEmail) {
        console.warn(
          `⚠️  Skipping row with missing professorEmail: ${JSON.stringify(row)}`,
        );
        return false;
      }
      if (
        typeof row.percentageGrade !== "number" ||
        isNaN(row.percentageGrade)
      ) {
        console.warn(
          `⚠️  Skipping row with invalid percentageGrade: ${JSON.stringify(row)}`,
        );
        return false;
      }
      return true;
    });

    console.log(`✅ ${validRows.length} valid rows after filtering\n`);

    // Group by class
    console.log("📊 Grouping enrollments by class...");
    const classesMap = groupEnrollmentsByClass(validRows);
    console.log(`✅ Found ${classesMap.size} unique classes\n`);

    // Show summary
    console.log("📋 Class Summary:");
    let totalStudents = 0;
    for (const [classKey, classData] of classesMap.entries()) {
      totalStudents += classData.students.length;
      console.log(
        `  - ${classKey}: ${classData.students.length} students (Professor: ${classData.professorEmail})`,
      );
    }
    console.log(`\n👥 Total students across all classes: ${totalStudents}\n`);

    // Convert to JSONL
    console.log("💾 Converting to JSONL format...");
    const jsonlContent = convertToJSONL(classesMap);

    // Write to file
    fs.writeFileSync(OUTPUT_FILE, jsonlContent, "utf-8");
    console.log(`✅ Successfully wrote ${classesMap.size} lines to ${OUTPUT_FILE}\n`);

    // Verify file
    const fileSize = fs.statSync(OUTPUT_FILE).size;
    console.log(`📦 Output file size: ${(fileSize / 1024).toFixed(2)} KB`);

    console.log("\n✨ Conversion complete!");
  } catch (error) {
    console.error("\n❌ Error during conversion:");
    console.error(error);
    process.exit(1);
  }
}

main();
