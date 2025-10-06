"use client";

import * as React from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { EnrollmentHistoryItem } from "./types";
import { Calendar, User, BookOpen, GraduationCap, FileText } from "lucide-react";

interface CourseDetailsDialogProps {
    course: EnrollmentHistoryItem | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function CourseDetailsDialog({
    course,
    open,
    onOpenChange,
}: CourseDetailsDialogProps) {
    if (!course) return null;

    const categoryMap = {
        humanities: "Humanities",
        core: "Core",
        elective: "Elective",
        general: "General",
    };

    const getGradeColor = (grade: string) => {
        if (grade.startsWith("A")) return "bg-green-100 text-green-800";
        if (grade.startsWith("B")) return "bg-blue-100 text-blue-800";
        if (grade.startsWith("C")) return "bg-yellow-100 text-yellow-800";
        if (grade.startsWith("D")) return "bg-orange-100 text-orange-800";
        return "bg-red-100 text-red-800";
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-bold">
                        {course.courseName}
                    </DialogTitle>
                    <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className="font-mono">
                            {course.courseCode}
                        </Badge>
                        <Badge variant="secondary">
                            {categoryMap[course.category as keyof typeof categoryMap] || course.category}
                        </Badge>
                        <Badge variant="secondary">{course.credits} Credits</Badge>
                        {course.isRetake && (
                            <Badge variant="destructive">Retake</Badge>
                        )}
                    </div>
                </DialogHeader>

                <div className="space-y-6 mt-4">
                    {/* Grade Information */}
                    <div className="space-y-3">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                            <GraduationCap className="h-5 w-5" />
                            Grade Information
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="space-y-1">
                                <p className="text-sm text-muted-foreground">Letter Grade</p>
                                {course.letterGrade ? (
                                    <Badge className={`${getGradeColor(course.letterGrade)} text-base px-3 py-1`}>
                                        {course.letterGrade}
                                    </Badge>
                                ) : (
                                    <p className="text-sm">Pending</p>
                                )}
                            </div>
                            <div className="space-y-1">
                                <p className="text-sm text-muted-foreground">Percentage</p>
                                <p className="text-base font-semibold">
                                    {course.percentageGrade !== undefined
                                        ? `${course.percentageGrade.toFixed(1)}%`
                                        : "N/A"}
                                </p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-sm text-muted-foreground">GPA Points</p>
                                <p className="text-base font-semibold">
                                    {course.gradePoints !== undefined
                                        ? course.gradePoints.toFixed(2)
                                        : "N/A"}
                                </p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-sm text-muted-foreground">Status</p>
                                <p className="text-base font-semibold capitalize">
                                    {course.status.replace("_", " ")}
                                </p>
                            </div>
                        </div>
                    </div>

                    <Separator />

                    {/* Section Information */}
                    <div className="space-y-3">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                            <BookOpen className="h-5 w-5" />
                            Section Details
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <p className="text-sm text-muted-foreground">Group Number</p>
                                <p className="text-base font-semibold">{course.groupNumber}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-sm text-muted-foreground flex items-center gap-1">
                                    <User className="h-4 w-4" />
                                    Instructor
                                </p>
                                <p className="text-base font-semibold">{course.professorName}</p>
                            </div>
                        </div>
                    </div>

                    {/* Schedule Information */}
                    {course.section?.schedule && (
                        <>
                            <Separator />
                            <div className="space-y-3">
                                <h3 className="text-lg font-semibold flex items-center gap-2">
                                    <Calendar className="h-5 w-5" />
                                    Schedule
                                </h3>
                                <div className="space-y-2">
                                    {course.section.schedule.sessions?.map((session: any, index: number) => (
                                        <div
                                            key={index}
                                            className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                                        >
                                            <span className="font-medium capitalize">{session.day}</span>
                                            <span className="text-sm text-muted-foreground">
                                                {session.startTime} - {session.endTime}
                                            </span>
                                        </div>
                                    ))}
                                    {course.section.schedule.timezone && (
                                        <p className="text-sm text-muted-foreground">
                                            Timezone: {course.section.schedule.timezone}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </>
                    )}

                    {/* Course Description */}
                    {course.course?.descriptionEs && (
                        <>
                            <Separator />
                            <div className="space-y-3">
                                <h3 className="text-lg font-semibold flex items-center gap-2">
                                    <FileText className="h-5 w-5" />
                                    Description
                                </h3>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                    {course.course.descriptionEs}
                                </p>
                            </div>
                        </>
                    )}

                    {/* Prerequisites */}
                    {course.course?.prerequisites && course.course.prerequisites.length > 0 && (
                        <>
                            <Separator />
                            <div className="space-y-3">
                                <h3 className="text-lg font-semibold">Prerequisites</h3>
                                <div className="flex flex-wrap gap-2">
                                    {course.course.prerequisites.map((prereq: string, index: number) => (
                                        <Badge key={index} variant="outline">
                                            {prereq}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}

                    {/* Additional Notes */}
                    {course.enrollment?.gradeNotes && (
                        <>
                            <Separator />
                            <div className="space-y-3">
                                <h3 className="text-lg font-semibold">Notes</h3>
                                <div className="p-3 bg-muted/50 rounded-lg">
                                    <p className="text-sm text-muted-foreground">
                                        {course.enrollment.gradeNotes}
                                    </p>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
