"use client"

import AdminMetricsGrid from './admin/metrics-grid'
import UpcomingDeadlinesCard from './admin/upcoming-deadlines-card'
import RecentActivitiesCard from './admin/recent-activities-card'

export default function AdminDashboard() {
    // TODO: Replace with real Convex queries
    // Each component now handles its own data fetching independently
    // This prevents blocking the entire dashboard if one query is slow

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="@container/main space-y-4 md:space-y-6 py-6">
                <AdminMetricsGrid />
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
                    <UpcomingDeadlinesCard />
                    <RecentActivitiesCard />
                </div>
            </div>
        </div>
    )
}
