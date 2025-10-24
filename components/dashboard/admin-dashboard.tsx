"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import AdminMetricsGrid from "./admin/metrics-grid";
import UpcomingDeadlinesCard from "./admin/upcoming-deadlines-card";
import RecentActivitiesCard from "./admin/recent-activities-card";
import { Loader2, AlertCircle } from "lucide-react";
import { useAuth } from "@clerk/nextjs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function AdminDashboard() {
  const { isLoaded, isSignedIn } = useAuth();

  // Only fetch data if user is authenticated
  const data = useQuery(
    api.dashboard.getAdminDashboard,
    isLoaded && isSignedIn ? {} : "skip",
  );

  // Show loading state while auth is loading or data is being fetched
  if (!isLoaded || !isSignedIn) {
    return (
      <div className="max-w-7xl mx-auto   py-12">
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
      <div className="max-w-7xl mx-auto   py-12">
        <div className="flex flex-col items-center justify-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-lg font-medium text-muted-foreground">
            Loading dashboard data...
          </p>
        </div>
      </div>
    );
  }

  // Handle when user doesn't have admin access
  if (data === null) {
    return (
      <div className="max-w-7xl mx-auto py-12">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>
            You don't have permission to view the admin dashboard. Please
            contact a system administrator if you believe this is an error.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto ">
      <div className="@container/main space-y-4 md:space-y-6 py-6">
        <AdminMetricsGrid metricsData={data.metrics} />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          <UpcomingDeadlinesCard data={data} />
          <RecentActivitiesCard data={data} />
        </div>
      </div>
    </div>
  );
}
