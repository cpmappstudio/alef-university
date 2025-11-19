"use client";

import * as React from "react";
import { ColumnDef } from "@tanstack/react-table";
import { Input } from "@/components/ui/input";
import type { Translator } from "@/lib/table/types";
import type {
  ClassEnrollmentRow,
  ClassWithRelations,
} from "@/lib/classes/types";
import type { Id } from "@/convex/_generated/dataModel";

const createStudentColumn = (
  t: Translator,
  emptyValue: string,
): ColumnDef<ClassEnrollmentRow> => ({
  accessorKey: "student",
  header: t("columns.student"),
  cell: ({ row }) => {
    const student = row.original.student;
    if (!student) return emptyValue;

    const fullName = [student.firstName, student.lastName]
      .filter(Boolean)
      .join(" ")
      .trim();

    return (
      <div className="flex flex-col">
        <span className="font-medium">{fullName || "-"}</span>
        <span className="text-xs text-muted-foreground">
          {student.email ?? ""}
        </span>
      </div>
    );
  },
});

const createStudentCodeColumn = (
  t: Translator,
  emptyValue: string,
): ColumnDef<ClassEnrollmentRow> => ({
  accessorKey: "studentCode",
  header: t("columns.studentCode"),
  cell: ({ row }) =>
    row.original.student?.studentProfile?.studentCode ?? emptyValue,
});

const createPercentageGradeColumn = (
  t: Translator,
  classStatus: ClassWithRelations["status"],
  onGradeChange: (enrollmentId: Id<"class_enrollments">, grade: number) => void,
): ColumnDef<ClassEnrollmentRow> => ({
  accessorKey: "percentageGrade",
  header: () => <div className="text-left">{t("columns.percentageGrade")}</div>,
  cell: ({ row }) => {
    const grade = row.original.percentageGrade;
    const isEditable = classStatus === "grading";
    const enrollmentId = row.original._id;

    const [localValue, setLocalValue] = React.useState(
      grade !== undefined && grade !== null ? grade.toString() : "",
    );

    // Update local value when grade prop changes
    React.useEffect(() => {
      setLocalValue(
        grade !== undefined && grade !== null ? grade.toString() : "",
      );
    }, [grade]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setLocalValue(e.target.value);
    };

    const handleBlur = () => {
      if (localValue === "") return;

      const numericValue = parseFloat(localValue);
      if (!isNaN(numericValue) && numericValue >= 0 && numericValue <= 100) {
        onGradeChange(enrollmentId, numericValue);
      } else {
        // Reset to original value if invalid
        setLocalValue(
          grade !== undefined && grade !== null ? grade.toString() : "",
        );
      }
    };

    return (
      <div className="text-right">
        <Input
          type="number"
          min="0"
          max="100"
          step="0.01"
          value={localValue}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder="0.00"
          className={`w-20 text-right font-mono ${!isEditable ? "opacity-50 cursor-not-allowed" : ""}`}
          disabled={!isEditable}
        />
      </div>
    );
  },
});

const createLetterGradeColumn = (
  t: Translator,
  emptyValue: string,
): ColumnDef<ClassEnrollmentRow> => ({
  accessorKey: "letterGrade",
  header: () => <div className="text-center">{t("columns.letterGrade")}</div>,
  cell: ({ row }) => (
    <div className="text-center font-semibold">
      {row.original.letterGrade ?? emptyValue}
    </div>
  ),
});

const createGradePointsColumn = (
  t: Translator,
  emptyValue: string,
): ColumnDef<ClassEnrollmentRow> => ({
  accessorKey: "gradePoints",
  header: () => <div className="text-right">{t("columns.gradePoints")}</div>,
  cell: ({ row }) => {
    const points = row.original.gradePoints;
    return (
      <div className="text-right font-mono">
        {points !== undefined && points !== null
          ? points.toFixed(2)
          : emptyValue}
      </div>
    );
  },
});

export const classEnrollmentColumns = (
  t: Translator,
  classStatus: ClassWithRelations["status"],
  onGradeChange: (enrollmentId: Id<"class_enrollments">, grade: number) => void,
): ColumnDef<ClassEnrollmentRow>[] => {
  const emptyValue = t("columns.emptyValue");

  return [
    createStudentColumn(t, emptyValue),
    createStudentCodeColumn(t, emptyValue),
    createPercentageGradeColumn(t, classStatus, onGradeChange),
    createLetterGradeColumn(t, emptyValue),
    createGradePointsColumn(t, emptyValue),
  ];
};
