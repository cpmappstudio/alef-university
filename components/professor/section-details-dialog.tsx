"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useQuery, useMutation } from "convex/react"; // Add this import
import { api } from "@/convex/_generated/api"; // Add this import
import { Id } from "@/convex/_generated/dataModel"; // Add this import
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  TeachingHistorySection,
  StudentGradeEntry,
} from "../../lib/professors/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Calendar, Clock, BookOpen, Users, Save, Loader2 } from "lucide-react"; // Add Loader2

// Remove the mock students data

interface SectionDetailsDialogProps {
  section: TeachingHistorySection | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SectionDetailsDialog({
  section,
  open,
  onOpenChange,
}: SectionDetailsDialogProps) {
  const t = useTranslations("gradebook");

  // Replace mock data with query to get real students
  // Only execute query when dialog is open and section exists
  const students = useQuery(
    api.professors.getStudentsBySection,
    open && section ? { sectionId: section._id as Id<"sections"> } : "skip",
  );

  // Add mutation for submitting grades
  const submitGrades = useMutation(api.professors.submitGrades);

  const [editedGrades, setEditedGrades] = React.useState<
    Record<string, { grade: string; notes: string }>
  >({});

  // Initialize edited grades state when data loads
  React.useEffect(() => {
    if (students?.students && open) {
      // Reset edited grades when opening with new data
      const initialGrades: Record<string, { grade: string; notes: string }> =
        {};
      students.students.forEach((student) => {
        initialGrades[student.enrollment._id] = {
          grade: student.grade.percentageGrade?.toString() || "",
          notes: student.grade.gradeNotes || "",
        };
      });
      setEditedGrades(initialGrades);
    }
  }, [students, open]);

  if (!section) return null;

  const handleGradeChange = (studentId: string, value: string) => {
    setEditedGrades((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        grade: value,
      },
    }));
  };

  const handleNotesChange = (studentId: string, value: string) => {
    setEditedGrades((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        notes: value,
      },
    }));
  };

  // Update to use real submission endpoint
  const handleSaveGrades = async () => {
    if (!section || !students) return;

    try {
      // Convert edited grades to the format expected by the API
      const gradesToSubmit = Object.entries(editedGrades)
        .map(([enrollmentId, { grade, notes }]) => ({
          enrollmentId: enrollmentId as Id<"enrollments">,
          percentageGrade: parseFloat(grade),
          gradeNotes: notes,
        }))
        .filter((g) => !isNaN(g.percentageGrade)); // Filter out invalid grades

      // Submit grades using the mutation with forceSubmit set to true
      await submitGrades({
        sectionId: section._id as Id<"sections">,
        grades: gradesToSubmit,
        forceSubmit: false, // Change to true to bypass the period check
      });

      alert(t("sectionDetails.gradesSaved"));
    } catch (error) {
      console.error("Failed to save grades:", error);
      alert("Failed to save grades. Please try again.");
    }
  };

  const categoryMap = {
    humanities: t("categories.humanities"),
    core: t("categories.core"),
    elective: t("categories.electives"),
    general: "General",
  };

  const getGradeColor = (grade?: string) => {
    if (!grade) return "";
    if (grade.startsWith("A")) return "bg-green-100 text-green-800";
    if (grade.startsWith("B")) return "bg-blue-100 text-blue-800";
    if (grade.startsWith("C")) return "bg-yellow-100 text-yellow-800";
    if (grade.startsWith("D")) return "bg-orange-100 text-orange-800";
    return "bg-red-100 text-red-800";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto bg-background border-border shadow-2xl">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <DialogTitle className="text-2xl font-bold">
                {section.courseName}
              </DialogTitle>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="font-mono">
                  {section.courseCode}
                </Badge>
                <Badge variant="outline">
                  {t("sectionDetails.group")} {section.groupNumber}
                </Badge>
                <Badge
                  className={
                    categoryMap[section.category as keyof typeof categoryMap]
                      ? "capitalize"
                      : ""
                  }
                >
                  {categoryMap[section.category as keyof typeof categoryMap] ||
                    section.category}
                </Badge>
                <Badge variant="secondary">
                  {section.credits} {t("table.credits")}
                </Badge>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Course Information */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" />
                  <span className="font-medium">
                    {t("sectionDetails.enrolledStudents")}
                  </span>
                </div>
                <p className="text-lg font-semibold">
                  {section.enrolledStudents + section.completedStudents}{" "}
                  {t("sectionDetails.students")}
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span className="font-medium">{t("table.closingDate")}</span>
                </div>
                <p className="text-lg font-semibold">
                  {new Date(section.closingDate).toLocaleDateString()}
                </p>
              </div>
            </div>

            {/* Course description */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <BookOpen className="h-4 w-4" />
                <span className="font-medium">
                  {t("sectionDetails.description")}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                {section.course?.descriptionEs ||
                  t("sectionDetails.mockDescription")}
              </p>
            </div>

            {/* Schedule info - could be expanded later */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span className="font-medium">
                  {t("sectionDetails.schedule")}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {section.section?.schedule?.sessions ? (
                  section.section.schedule.sessions.map(
                    (session: any, index: number) => (
                      <Badge key={index} variant="outline">
                        {session.dayOfWeek} {session.startTime} -{" "}
                        {session.endTime}
                      </Badge>
                    ),
                  )
                ) : (
                  <Badge variant="outline">
                    {t("sectionDetails.scheduleNotAvailable")}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* Student List with Grades */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">
                {t("sectionDetails.studentList")}
              </h3>
              <Button onClick={handleSaveGrades} size="sm">
                <Save className="h-4 w-4 mr-2" />
                {t("sectionDetails.saveGrades")}
              </Button>
            </div>

            <div className="rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-semibold">
                      {t("sectionDetails.studentCode")}
                    </TableHead>
                    <TableHead className="font-semibold">
                      {t("sectionDetails.studentName")}
                    </TableHead>
                    <TableHead className="font-semibold w-32">
                      {t("sectionDetails.percentGrade")}
                    </TableHead>
                    <TableHead className="font-semibold w-24">
                      {t("sectionDetails.letterGrade")}
                    </TableHead>
                    <TableHead className="font-semibold">
                      {t("sectionDetails.notes")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students === undefined ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <Loader2 className="h-8 w-8 animate-spin text-primary" />
                          <span className="text-muted-foreground">
                            {t("sectionDetails.loadingStudents")}
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : students.students.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8">
                        <span className="text-muted-foreground">
                          {t("sectionDetails.noStudents")}
                        </span>
                      </TableCell>
                    </TableRow>
                  ) : (
                    students.students.map((student) => (
                      <TableRow key={student.enrollment._id}>
                        <TableCell className="font-mono text-sm">
                          {student.student?.studentProfile?.studentCode ||
                            "N/A"}
                        </TableCell>
                        <TableCell className="font-medium">
                          {student.student?.firstName}{" "}
                          {student.student?.lastName}
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            value={
                              editedGrades[student.enrollment._id]?.grade || ""
                            }
                            onChange={(e) =>
                              handleGradeChange(
                                student.enrollment._id,
                                e.target.value,
                              )
                            }
                            className="h-8 w-20"
                            placeholder="0-100"
                          />
                        </TableCell>
                        <TableCell>
                          {student.grade.letterGrade && (
                            <Badge
                              className={`${getGradeColor(student.grade.letterGrade)}`}
                            >
                              {student.grade.letterGrade}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Input
                            type="text"
                            value={
                              editedGrades[student.enrollment._id]?.notes || ""
                            }
                            onChange={(e) =>
                              handleNotesChange(
                                student.enrollment._id,
                                e.target.value,
                              )
                            }
                            className="h-8"
                            placeholder={t("sectionDetails.addNotes")}
                          />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
