import { Id } from "@/convex/_generated/dataModel";

export interface EnrollmentHistoryItem {
    _id: Id<"enrollments">;
    courseCode: string;
    courseName: string;
    groupNumber: string;
    credits: number;
    category: string;
    letterGrade?: string;
    percentageGrade?: number;
    gradePoints?: number;
    status: string;
    isRetake: boolean;
    professorName: string;
    // Full objects for dialog details
    enrollment: any;
    course: any;
    section: any;
    professor: any;
}

export interface PeriodHistorySummary {
    period: any;
    enrollments: EnrollmentHistoryItem[];
    enrolledCredits: number;
    approvedCredits: number;
    approvalPercentage: number;
    periodGPA: number;
    accumulatedCredits: number;
    accumulatedApprovedCredits: number;
}
