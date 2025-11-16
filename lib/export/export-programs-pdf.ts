import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { ProgramExportRow } from "@/lib/programs/types";

// Alef University logo in base64 (simplified version)
import { ALEF_LOGO_BASE64 } from "./ALEF_LOGO_BASE64";

interface ExportProgramsPDFOptions {
  programs: ProgramExportRow[];
  categoryLabels: Record<string, string>;
  locale: string;
  translations: {
    title: string;
    generatedOn: string;
    totalPrograms: string;
    page: string;
    of: string;
    columns: {
      code: string;
      program: string;
      type: string;
      category: string;
      language: string;
      credits: string;
      duration: string;
      status: string;
    };
    types: {
      diploma: string;
      bachelor: string;
      master: string;
      doctorate: string;
    };
    languages: {
      es: string;
      en: string;
      both: string;
    };
    status: {
      active: string;
      inactive: string;
    };
    emptyValue: string;
  };
}

const getLocalizedValue = (
  program: ProgramExportRow,
  esKey: "codeEs" | "nameEs" | "descriptionEs",
  enKey: "codeEn" | "nameEn" | "descriptionEn",
  locale: string,
): string => {
  const valueEs = program[esKey]?.trim() || "";
  const valueEn = program[enKey]?.trim() || "";

  if (program.language === "both") {
    if (locale === "en") {
      return valueEn && valueEs
        ? `EN: ${valueEn} / ES: ${valueEs}`
        : valueEn || valueEs || "";
    } else {
      return valueEs && valueEn
        ? `ES: ${valueEs} / EN: ${valueEn}`
        : valueEs || valueEn || "";
    }
  }

  if (program.language === "en") {
    return valueEn || valueEs || "";
  }

  return valueEs || valueEn || "";
};

export const exportProgramsToPDF = (options: ExportProgramsPDFOptions) => {
  const { programs, categoryLabels, locale, translations } = options;

  // Create new PDF document - Portrait orientation
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;

  // Prepare table data
  const tableData = programs.map((program) => {
    const code = getLocalizedValue(program, "codeEs", "codeEn", locale);
    const name = getLocalizedValue(program, "nameEs", "nameEn", locale);
    const type = program.type
      ? (translations.types as Record<string, string>)[program.type] ||
        program.type
      : translations.emptyValue;
    const category = program.categoryId
      ? categoryLabels[String(program.categoryId)] || translations.emptyValue
      : translations.emptyValue;
    const language =
      translations.languages[program.language] || program.language;
    const credits = program.totalCredits?.toString() || translations.emptyValue;
    const duration =
      program.durationBimesters?.toString() || translations.emptyValue;
    const status = program.isActive
      ? translations.status.active
      : translations.status.inactive;

    return [code, name, type, category, language, credits, duration, status];
  });

  // Header columns
  const headers = [
    translations.columns.code,
    translations.columns.program,
    translations.columns.type,
    translations.columns.category,
    translations.columns.language,
    translations.columns.credits,
    translations.columns.duration,
    translations.columns.status,
  ];

  // Generate table with autoTable
  autoTable(doc, {
    head: [headers],
    body: tableData,
    startY: 55,
    margin: { top: 55, right: 14, bottom: 25, left: 14 },
    styles: {
      font: "helvetica",
      fontSize: 9,
      cellPadding: 3,
      lineColor: [0, 0, 0],
      lineWidth: 0,
      textColor: [0, 0, 0],
      overflow: "linebreak",
    },
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      fontSize: 9,
      fontStyle: "bold",
      halign: "left",
      valign: "middle",
      cellPadding: 0,
      lineWidth: 0,
      lineColor: [0, 0, 0],
    },
    bodyStyles: {
      fillColor: [255, 255, 255],
      fontSize: 9,
      lineWidth: 0,
    },
    alternateRowStyles: {
      fillColor: [255, 255, 255],
    },
    columnStyles: {
      0: { cellWidth: 22, halign: "left" },
      1: { cellWidth: 45, halign: "left" },
      2: { cellWidth: 22, halign: "left" },
      3: { cellWidth: 28, halign: "left" },
      4: { cellWidth: 22, halign: "left" },
      5: { cellWidth: 15, halign: "center" },
      6: { cellWidth: 15, halign: "center" },
      7: { cellWidth: 18, halign: "left" },
    },
    showHead: "everyPage",
    theme: "plain",

    willDrawCell: (data) => {
      // Only draw bottom border for header cells
      if (data.section === "head" && data.row.index === 0) {
        data.cell.styles.lineWidth = 0;
        data.cell.styles.lineColor = [0, 0, 0];
      }
    },

    didDrawPage: (data) => {
      // Draw line under header manually
      const startY = 55 + 3 + 9 + 3; // startY + padding + fontSize + padding
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.5);
      doc.line(14, startY, pageWidth - 14, startY);

      // HEADER - Logo centered at top
      try {
        // Logo with proper aspect ratio (approximately 4:1 width to height)
        const logoWidth = 42;
        const logoHeight = 15;
        doc.addImage(
          ALEF_LOGO_BASE64,
          "PNG",
          pageWidth / 2 - logoWidth / 2,
          8,
          logoWidth,
          logoHeight,
        );
      } catch (e) {
        // If logo fails to load, show text instead
        doc.setFontSize(16);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(102, 153, 204);
        doc.text("Alef University", pageWidth / 2, 17, { align: "center" });
      }

      // Title - Left aligned below logo
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 0, 0);
      doc.text(translations.title, 14, 35);

      // Date - Below title
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      const currentDate = new Date().toLocaleDateString(
        locale === "es" ? "es-ES" : "en-US",
        {
          year: "numeric",
          month: "long",
          day: "numeric",
        },
      );
      doc.text(currentDate, 14, 42);

      // FOOTER
      // Website on the left
      doc.setFontSize(8);
      doc.setTextColor(80, 80, 80);
      doc.setFont("helvetica", "normal");
      doc.text("www.alef.university", 14, pageHeight - 10);

      // Tagline on the right
      doc.text(
        "No enseñamos qué pensar, sino cómo pensar",
        pageWidth - 14,
        pageHeight - 10,
        { align: "right" },
      );
    },
  });

  // Generate filename
  const timestamp = new Date().toISOString().split("T")[0];
  const filename = `programs-export-${timestamp}.pdf`;

  // Save the PDF
  doc.save(filename);
};
