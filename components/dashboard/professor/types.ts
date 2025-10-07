// Types for Professor Dashboard
export interface CurrentSection {
    id: string
    courseCode: string
    courseName: string
    groupNumber: number
    credits: number
    enrolledStudents: number
    closingDate: string
    category: "general" | "professional" | "specialty"
    status: "active" | "grading" | "closed"
    schedule?: string
}

export interface ProfessorDashboardData {
    currentPeriod: string
    totalSections: number
    totalStudents: number
    sectionsToGrade: number
    sections: CurrentSection[]
    upcomingClosingDates: {
        courseCode: string
        courseName: string
        groupNumber: number
        closingDate: string
        daysRemaining: number
    }[]
}

export interface ProfessorMetrics {
    currentPeriod: string
    totalSections: number
    totalStudents: number
    sectionsToGrade: number
    averageEnrollment: number
    totalCreditsTeaching: number
    periodsTaught: number
    totalStudentsTaught: number
}
