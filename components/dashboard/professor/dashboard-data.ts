import { ProfessorDashboardData, ProfessorMetrics } from "./types"

// Mock data for professor dashboard
export function getMockProfessorDashboardData(): ProfessorDashboardData {
    const today = new Date()
    const addDays = (days: number) => {
        const date = new Date(today)
        date.setDate(date.getDate() + days)
        return date.toISOString().split('T')[0]
    }

    return {
        currentPeriod: "2024-2025 Bimester 1",
        totalSections: 4,
        totalStudents: 127,
        sectionsToGrade: 1,
        sections: [
            {
                id: "1",
                courseCode: "CS-301",
                courseName: "Data Structures and Algorithms",
                groupNumber: 1,
                credits: 4,
                enrolledStudents: 35,
                closingDate: addDays(5),
                category: "professional",
                status: "active",
                schedule: "Mon/Wed 8:00-10:00"
            },
            {
                id: "2",
                courseCode: "CS-301",
                courseName: "Data Structures and Algorithms",
                groupNumber: 2,
                credits: 4,
                enrolledStudents: 32,
                closingDate: addDays(5),
                category: "professional",
                status: "active",
                schedule: "Tue/Thu 10:00-12:00"
            },
            {
                id: "3",
                courseCode: "CS-450",
                courseName: "Software Engineering",
                groupNumber: 1,
                credits: 3,
                enrolledStudents: 28,
                closingDate: addDays(3),
                category: "specialty",
                status: "grading",
                schedule: "Mon/Wed 14:00-16:00"
            },
            {
                id: "4",
                courseCode: "CS-101",
                courseName: "Introduction to Programming",
                groupNumber: 3,
                credits: 4,
                enrolledStudents: 32,
                closingDate: addDays(12),
                category: "general",
                status: "active",
                schedule: "Fri 8:00-12:00"
            }
        ],
        upcomingClosingDates: [
            {
                courseCode: "CS-450",
                courseName: "Software Engineering",
                groupNumber: 1,
                closingDate: addDays(3),
                daysRemaining: 3
            },
            {
                courseCode: "CS-301",
                courseName: "Data Structures and Algorithms",
                groupNumber: 1,
                closingDate: addDays(5),
                daysRemaining: 5
            },
            {
                courseCode: "CS-301",
                courseName: "Data Structures and Algorithms",
                groupNumber: 2,
                closingDate: addDays(5),
                daysRemaining: 5
            },
            {
                courseCode: "CS-101",
                courseName: "Introduction to Programming",
                groupNumber: 3,
                closingDate: addDays(12),
                daysRemaining: 12
            }
        ]
    }
}

export function getMockProfessorMetrics(): ProfessorMetrics {
    return {
        currentPeriod: "2024-2025 Bimester 1",
        totalSections: 4,
        totalStudents: 127,
        sectionsToGrade: 1,
        averageEnrollment: 31.75,
        totalCreditsTeaching: 15,
        periodsTaught: 12,
        totalStudentsTaught: 1458
    }
}
