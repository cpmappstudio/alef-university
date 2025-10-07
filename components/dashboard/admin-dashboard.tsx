"use client"

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import AdminMetricsGrid from './admin/metrics-grid'
import UpcomingDeadlinesCard from './admin/upcoming-deadlines-card'
import RecentActivitiesCard from './admin/recent-activities-card'
import { Loader2 } from "lucide-react";

export default function AdminDashboard() {
    // Fetch real data from Convex
    const data = useQuery(api.dashboard.getAdminDashboard);

    // Show loading state while data is being fetched
    if (data === undefined) {
        return (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="flex flex-col items-center justify-center space-y-4">
                    <Loader2 className="h-12 w-12 animate-spin text-primary" />
                    <p className="text-lg font-medium text-muted-foreground">
                        Loading dashboard data...
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="@container/main space-y-4 md:space-y-6 py-6">
                <AdminMetricsGrid metricsData={data.metrics} />
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
                    <UpcomingDeadlinesCard data={data} />
                    <RecentActivitiesCard data={data} />
                </div>
            </div>
        </div>
    )
}