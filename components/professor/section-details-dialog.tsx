"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
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
import { TeachingHistorySection, StudentGradeEntry } from "./types";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Calendar, Clock, BookOpen, Users, Save } from "lucide-react";

// Mock students data
const mockStudents: StudentGradeEntry[] = [
    {
        _id: "e1" as any,
        studentId: "u1" as any,
        studentName: "Juan Pérez García",
        studentCode: "EST-2021-001",
        percentageGrade: 95,
        letterGrade: "A",
        status: "completed",
        notes: "Excelente participación en clase",
    },
    {
        _id: "e2" as any,
        studentId: "u2" as any,
        studentName: "María González López",
        studentCode: "EST-2021-002",
        percentageGrade: 88,
        letterGrade: "B+",
        status: "completed",
    },
    {
        _id: "e3" as any,
        studentId: "u3" as any,
        studentName: "Carlos Rodríguez Martínez",
        studentCode: "EST-2021-003",
        percentageGrade: 91,
        letterGrade: "A-",
        status: "completed",
    },
    {
        _id: "e4" as any,
        studentId: "u4" as any,
        studentName: "Ana Martínez Sánchez",
        studentCode: "EST-2021-004",
        status: "enrolled",
    },
    {
        _id: "e5" as any,
        studentId: "u5" as any,
        studentName: "Pedro Sánchez Torres",
        studentCode: "EST-2021-005",
        status: "enrolled",
    },
];

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
    const [students, setStudents] = React.useState<StudentGradeEntry[]>([]);
    const [editedGrades, setEditedGrades] = React.useState<
        Record<string, { grade: string; notes: string }>
    >({});

    // Load mock students when dialog opens
    React.useEffect(() => {
        if (open && section) {
            setStudents(mockStudents);
            // Initialize edited grades state
            const initialGrades: Record<string, { grade: string; notes: string }> =
                {};
            mockStudents.forEach((student) => {
                initialGrades[student._id] = {
                    grade: student.percentageGrade?.toString() || "",
                    notes: student.notes || "",
                };
            });
            setEditedGrades(initialGrades);
        }
    }, [open, section]);

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

    const handleSaveGrades = () => {
        // TODO: Implement save functionality when backend is ready
        console.log("Saving grades:", editedGrades);
        alert(t("sectionDetails.gradesSaved"));
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
            <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
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
                                <Badge variant="secondary">{section.credits} {t("table.credits")}</Badge>
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
                                    <span className="font-medium">{t("sectionDetails.enrolledStudents")}</span>
                                </div>
                                <p className="text-lg font-semibold">{section.enrolledStudents} {t("sectionDetails.students")}</p>
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

                        {/* Mock course description */}
                        <div className="space-y-2">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <BookOpen className="h-4 w-4" />
                                <span className="font-medium">{t("sectionDetails.description")}</span>
                            </div>
                            <p className="text-sm text-muted-foreground">
                                {t("sectionDetails.mockDescription")}
                            </p>
                        </div>

                        {/* Mock schedule */}
                        <div className="space-y-2">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Clock className="h-4 w-4" />
                                <span className="font-medium">{t("sectionDetails.schedule")}</span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <Badge variant="outline">{t("sectionDetails.monday")} 14:00 - 16:00</Badge>
                                <Badge variant="outline">{t("sectionDetails.wednesday")} 14:00 - 16:00</Badge>
                            </div>
                        </div>
                    </div>

                    <Separator />

                    {/* Student List with Grades */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold">{t("sectionDetails.studentList")}</h3>
                            <Button onClick={handleSaveGrades} size="sm">
                                <Save className="h-4 w-4 mr-2" />
                                {t("sectionDetails.saveGrades")}
                            </Button>
                        </div>

                        <div className="rounded-lg border border-border overflow-hidden">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/50">
                                        <TableHead className="font-semibold">{t("sectionDetails.studentCode")}</TableHead>
                                        <TableHead className="font-semibold">{t("sectionDetails.studentName")}</TableHead>
                                        <TableHead className="font-semibold w-32">{t("sectionDetails.percentGrade")}</TableHead>
                                        <TableHead className="font-semibold w-24">{t("sectionDetails.letterGrade")}</TableHead>
                                        <TableHead className="font-semibold">{t("sectionDetails.notes")}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {students.map((student) => (
                                        <TableRow key={student._id}>
                                            <TableCell className="font-mono text-sm">
                                                {student.studentCode}
                                            </TableCell>
                                            <TableCell className="font-medium">
                                                {student.studentName}
                                            </TableCell>
                                            <TableCell>
                                                <Input
                                                    type="number"
                                                    min="0"
                                                    max="100"
                                                    value={editedGrades[student._id]?.grade || ""}
                                                    onChange={(e) =>
                                                        handleGradeChange(student._id, e.target.value)
                                                    }
                                                    className="h-8 w-20"
                                                    placeholder="0-100"
                                                />
                                            </TableCell>
                                            <TableCell>
                                                {student.letterGrade && (
                                                    <Badge
                                                        className={`${getGradeColor(student.letterGrade)}`}
                                                    >
                                                        {student.letterGrade}
                                                    </Badge>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <Input
                                                    type="text"
                                                    value={editedGrades[student._id]?.notes || ""}
                                                    onChange={(e) =>
                                                        handleNotesChange(student._id, e.target.value)
                                                    }
                                                    className="h-8"
                                                    placeholder={t("sectionDetails.addNotes")}
                                                />
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
