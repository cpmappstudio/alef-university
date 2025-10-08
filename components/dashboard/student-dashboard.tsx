"use client"

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import ProgramInfoCard from './academic/program-info-card'
import MetricsGrid from './academic/metrics-grid'
import CurrentSubjectsCard from './academic/current-subjects-card'
import DashboardWidgets from './academic/dashboard-widgets'
import { Loader2, AlertCircle } from "lucide-react";
import { useAuth } from "@clerk/nextjs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function StudentDashboard() {
    const { isLoaded, isSignedIn } = useAuth();
    
    const data = useQuery(
        api.dashboard.getStudentDashboard,
        isLoaded && isSignedIn ? {} : "skip"
    );

    if (!isLoaded || !isSignedIn) {
        return (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="flex flex-col items-center justify-center space-y-4">
                    <Loader2 className="h-12 w-12 animate-spin text-primary" />
                    <p className="text-lg font-medium text-muted-foreground">
                        Authenticating...
                    </p>
                </div>
            </div>
        );
    }

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

    if (data === null) {
        return (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Access Denied</AlertTitle>
                    <AlertDescription>
                        You don't have permission to view the student dashboard.
                        Please contact your administrator if you believe this is an error.
                    </AlertDescription>
                </Alert>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="@container/main space-y-4 md:space-y-6 py-6">
                <ProgramInfoCard programInfo={data.programInfo} />
                <MetricsGrid metricsData={data.metrics} />
                <CurrentSubjectsCard subjects={data.currentSubjects} />
                <DashboardWidgets 
                    creditDistribution={data.creditDistribution}
                    upcomingDates={data.upcomingDates} 
                />
            </div>
        </div>
    )
}