import { AdminDashboardData, AdminMetrics } from "./types"

// Mock data for admin dashboard
export function getMockAdminDashboardData(): AdminDashboardData {
    const today = new Date()
    const addDays = (days: number) => {
        const date = new Date(today)
        date.setDate(date.getDate() + days)
        return date.toISOString().split('T')[0]
    }

    const metrics: AdminMetrics = {
        activeProfessors: 45,
        activeStudents: 1234,
        activeCourses: 128,
        activePrograms: 8,
        totalEnrollments: 3456,
        activeSections: 156,
        currentPeriod: "2024-2025 Bimester 1",
        pendingEnrollments: 23
    }

    return {
        metrics,
        recentActivities: [
            {
                id: "1",
                type: "enrollment",
                action: "created",
                description: "35 students enrolled in CS-301 Section 1",
                timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
                user: "Admin User"
            },
            {
                id: "2",
                type: "professor",
                action: "created",
                description: "New professor added: Dr. Maria Rodriguez",
                timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
                user: "Admin User"
            },
            {
                id: "3",
                type: "course",
                action: "updated",
                description: "Course CS-450 updated with new syllabus",
                timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
                user: "Admin User"
            },
            {
                id: "4",
                type: "student",
                action: "created",
                description: "24 new students registered for Fall 2024",
                timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
                user: "Registrar Office"
            },
            {
                id: "5",
                type: "program",
                action: "updated",
                description: "Software Engineering program curriculum revised",
                timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
                user: "Academic Director"
            }
        ],
        upcomingDeadlines: [
            {
                id: "1",
                title: "Enrollment Deadline",
                description: "Last day for students to enroll in courses",
                date: addDays(5),
                daysRemaining: 5,
                type: "enrollment"
            },
            {
                id: "2",
                title: "Grade Submission",
                description: "Professors must submit final grades",
                date: addDays(12),
                daysRemaining: 12,
                type: "grading"
            },
            {
                id: "3",
                title: "Period Closing",
                description: "End of current academic period",
                date: addDays(18),
                daysRemaining: 18,
                type: "period"
            },
            {
                id: "4",
                title: "Registration Opens",
                description: "Next period registration begins",
                date: addDays(25),
                daysRemaining: 25,
                type: "enrollment"
            }
        ],
        quickStats: [
            {
                label: "Total Enrollments",
                value: 3456,
                change: 8.5,
                trend: "up",
                link: "/admin/students"
            },
            {
                label: "Active Sections",
                value: 156,
                change: 3.2,
                trend: "up",
                link: "/admin/courses"
            },
            {
                label: "Pending Enrollments",
                value: 23,
                change: -12.5,
                trend: "down",
                link: "/admin/students"
            },
            {
                label: "Course Completion Rate",
                value: 94,
                change: 2.1,
                trend: "up"
            }
        ]
    }
}

export function getMockAdminMetrics(): AdminMetrics {
    return {
        activeProfessors: 45,
        activeStudents: 1234,
        activeCourses: 128,
        activePrograms: 8,
        totalEnrollments: 3456,
        activeSections: 156,
        currentPeriod: "2024-2025 Bimester 1",
        pendingEnrollments: 23
    }
}
