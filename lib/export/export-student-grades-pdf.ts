// ################################################################################
// # File: export-student-grades-pdf.ts                                          #
// # Purpose: Export student transcript/grades to PDF                            #
// ################################################################################

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { ALEF_LOGO_BASE64 } from "./ALEF_LOGO_BASE64";
import { ALEF_WATER_BASE64 } from "./ALEF_WATER_BASE64";

interface StudentGradeRow {
  course: {
    codeEs?: string;
    codeEn?: string;
    nameEs?: string;
    nameEn?: string;
    credits?: number;
  } | null;
  percentageGrade?: number | null;
  letterGrade?: string | null;
}

interface ExportStudentGradesPDFOptions {
  student: {
    firstName?: string;
    lastName?: string;
    email?: string;
  };
  programName?: string;
  grades: StudentGradeRow[];
  locale: string;
  translations: {
    title: string;
    studentName: string;
    program: string;
    generatedOn: string;
    totalCourses: string;
    totalCredits: string;
    page: string;
    of: string;
    columns: {
      courseCode: string;
      courseName: string;
      credits: string;
      percentageGrade: string;
      letterGrade: string;
    };
    emptyValue: string;
  };
}

const getLocalizedValue = (
  valueEs: string | undefined,
  valueEn: string | undefined,
  locale: string,
  emptyValue: string,
): string => {
  if (locale === "es") {
    return valueEs || valueEn || emptyValue;
  }
  return valueEn || valueEs || emptyValue;
};

export function exportStudentGradesToPDF({
  student,
  programName,
  grades,
  locale,
  translations,
}: ExportStudentGradesPDFOptions) {
  // Initialize PDF
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Calculate total credits
  const totalCredits = grades.reduce((sum, grade) => {
    const credits = grade.course?.credits;
    return sum + (credits !== undefined && credits !== null ? credits : 0);
  }, 0);

  // Prepare table data
  const tableData = grades.map((grade) => {
    const course = grade.course;
    const code = course
      ? getLocalizedValue(
          course.codeEs,
          course.codeEn,
          locale,
          translations.emptyValue,
        )
      : translations.emptyValue;

    const name = course
      ? getLocalizedValue(
          course.nameEs,
          course.nameEn,
          locale,
          translations.emptyValue,
        )
      : translations.emptyValue;

    const credits =
      course?.credits !== undefined && course?.credits !== null
        ? course.credits.toString()
        : translations.emptyValue;

    const percentage =
      grade.percentageGrade !== undefined && grade.percentageGrade !== null
        ? `${grade.percentageGrade}%`
        : translations.emptyValue;

    const letter = grade.letterGrade || translations.emptyValue;

    return [code, name, credits, percentage, letter];
  });

  // Define headers
  const headers = [
    [
      translations.columns.courseCode,
      translations.columns.courseName,
      translations.columns.credits,
      translations.columns.percentageGrade,
      translations.columns.letterGrade,
    ],
  ];

  // Footer row with total credits
  const footerData = [
    ["", "", `${translations.totalCredits}: ${totalCredits}`, "", ""],
  ];

  // Variables to store positions for drawing lines after cells
  let headerBottomY = 0;
  let footerTopY = 0;

  // Generate table
  autoTable(doc, {
    head: headers,
    body: tableData,
    foot: footerData,
    startY: 55,
    margin: { top: 55, right: 14, bottom: 25, left: 14 },
    styles: {
      font: "times",
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
      cellPadding: 3,
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
    footStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      fontSize: 9,
      fontStyle: "bold",
      halign: "left",
      cellPadding: 3,
      lineWidth: 0,
      lineColor: [0, 0, 0],
    },
    columnStyles: {
      0: { cellWidth: 25, halign: "left" }, // Course Code
      1: { cellWidth: 60, halign: "left" }, // Course Name
      2: { cellWidth: 20, halign: "center" }, // Credits
      3: { cellWidth: 25, halign: "center" }, // Percentage
      4: { cellWidth: 20, halign: "center" }, // Letter Grade
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

    didDrawCell: (data) => {
      // Store positions for drawing lines after all cells are drawn
      if (
        data.section === "head" &&
        data.row.index === 0 &&
        data.column.index === 0
      ) {
        headerBottomY = data.cell.y + data.cell.height;
      }
      if (
        data.section === "foot" &&
        data.row.index === 0 &&
        data.column.index === 0
      ) {
        footerTopY = data.cell.y;
      }
    },

    didDrawPage: (data) => {
      // Draw lines after all cells are drawn (so they appear on top)
      if (headerBottomY > 0) {
        doc.setFillColor(0, 0, 0);
        doc.rect(14, headerBottomY, pageWidth - 14 - 14, 0.1, "F");
      }
      if (footerTopY > 0) {
        doc.setFillColor(0, 0, 0);
        doc.rect(14, footerTopY - 0.1, pageWidth - 14 - 14, 0.1, "F");
      }

      // Add watermark in the center of the page with reduced opacity
      try {
        doc.saveGraphicsState();
        doc.setGState(new (doc as any).GState({ opacity: 0.1 }));

        // Watermark dimensions and positioning
        const watermarkWidth = 80;
        const watermarkHeight = 80;
        const watermarkX = pageWidth / 2 - watermarkWidth / 2;
        const watermarkY = pageHeight / 2 - watermarkHeight / 2;

        doc.addImage(
          ALEF_WATER_BASE64,
          "PNG",
          watermarkX,
          watermarkY,
          watermarkWidth,
          watermarkHeight,
        );

        doc.restoreGraphicsState();
      } catch (e) {
        console.error("Error adding watermark:", e);
      }

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
        doc.setFont("times", "normal");
        doc.setTextColor(102, 153, 204);
        doc.text("Alef University", pageWidth / 2, 17, { align: "center" });
      }

      // Student info - Below logo
      doc.setFontSize(9);
      doc.setFont("times", "normal");
      doc.setTextColor(115, 115, 115); // Muted gray color
      const studentName =
        `${student.firstName || ""} ${student.lastName || ""}`.trim() ||
        student.email ||
        "";
      doc.text(`${translations.studentName}: ${studentName}`, 14, 35);

      // Program name if available
      let currentY = 35;
      if (programName) {
        currentY = 41;
        doc.text(`${translations.program}: ${programName}`, 14, 41);
      }

      // Generation date
      const currentDate = new Date().toLocaleDateString(
        locale === "es" ? "es-ES" : "en-US",
        {
          year: "numeric",
          month: "long",
          day: "numeric",
        },
      );
      doc.text(currentDate, 14, currentY + 6);

      // FOOTER
      // Website on the left
      doc.setFontSize(8);
      doc.setTextColor(80, 80, 80);
      doc.setFont("times", "normal");
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
  const studentName =
    `${student.firstName || ""} ${student.lastName || ""}`.trim() || "student";
  const cleanName = studentName
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
  const timestamp = new Date().toISOString().split("T")[0];
  const filename = `student-transcript-${cleanName}-${timestamp}.pdf`;

  // Save the PDF
  doc.save(filename);
}
