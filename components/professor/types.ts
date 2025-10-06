import { Id } from "@/convex/_generated/dataModel";

export type TeachingHistorySection = {
    _id: Id<"sections">;
    courseCode: string;
    courseName: string;
    groupNumber: string;
    credits: number;
    category: string;
    closingDate: number;
    status: "active" | "closed" | "cancelled";
    enrolledStudents: number;
    course: any;
    section: any;
    period: any;
};

export type PeriodTeachingSummary = {
    period: {
        _id: Id<"periods">;
        code: string;
        nameEs: string;
        startDate: number;
        endDate: number;
    };
    sections: TeachingHistorySection[];
    totalStudents: number;
    totalCourses: number;
};

export type StudentGradeEntry = {
    _id: Id<"enrollments">;
    studentId: Id<"users">;
    studentName: string;
    studentCode: string;
    percentageGrade?: number;
    letterGrade?: string;
    status: "enrolled" | "completed" | "failed" | "withdrawn" | "dropped";
    notes?: string;
};

export type SectionDetail = {
    _id: Id<"sections">;
    course: {
        _id: Id<"courses">;
        code: string;
        nameEs: string;
        nameEn?: string;
        credits: number;
        category: string;
        descriptionEs?: string;
        prerequisites?: string[];
    };
    section: {
        _id: Id<"sections">;
        groupNumber: string;
        schedule?: {
            sessions: Array<{
                day: string;
                startTime: string;
                endTime: string;
            }>;
            timezone: string;
        };
        maxStudents?: number;
    };
    period: {
        _id: Id<"periods">;
        code: string;
        nameEs: string;
        startDate: number;
        endDate: number;
    };
    students: StudentGradeEntry[];
};
