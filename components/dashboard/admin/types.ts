// Types for Admin Dashboard
export interface AdminMetrics {
    activeProfessors: number
    activeStudents: number
    activeCourses: number
    activePrograms: number
    totalEnrollments: number
    activeSections: number
    currentPeriod: string
    pendingEnrollments: number
}

export interface RecentActivity {
    id: string
    type: 'enrollment' | 'professor' | 'student' | 'course' | 'program'
    action: 'created' | 'updated' | 'deleted'
    description: string
    timestamp: string
    user?: string
}

export interface UpcomingDeadline {
    id: string
    title: string
    description: string
    date: string
    daysRemaining: number
    type: 'enrollment' | 'grading' | 'period' | 'other'
}

export interface QuickStat {
    label: string
    value: number
    change?: number
    trend?: 'up' | 'down' | 'neutral'
    link?: string
}

export interface AdminDashboardData {
    metrics: AdminMetrics
    recentActivities: RecentActivity[]
    upcomingDeadlines: UpcomingDeadline[]
    quickStats: QuickStat[]
}
