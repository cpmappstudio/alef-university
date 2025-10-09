import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity } from "lucide-react";
import { format } from "date-fns";
import { AdminDashboardData } from "./types";
import { getMockAdminDashboardData } from "./dashboard-data";
import { useState, useEffect } from 'react';

interface RecentActivitiesCardProps {
    data?: AdminDashboardData
}

export default function RecentActivitiesCard({ data: providedData }: RecentActivitiesCardProps) {
    const t = useTranslations('dashboard.admin');
    const [mounted, setMounted] = useState(false);

    // Use real data if provided, otherwise use mock data
    const data = providedData?.recentActivities?.length
        ? { recentActivities: providedData.recentActivities }
        : getMockAdminDashboardData();

    useEffect(() => {
        setMounted(true);
    }, []);

    // Helper function to get appropriate icon color
    const getIconColorClass = (type: string) => {
        switch (type) {
            case 'student':
                return 'bg-blue-100 text-blue-600';
            case 'professor':
                return 'bg-purple-100 text-purple-600';
            case 'course':
                return 'bg-green-100 text-green-600';
            case 'section':
                return 'bg-amber-100 text-amber-600';
            case 'enrollment':
                return 'bg-indigo-100 text-indigo-600';
            default:
                return 'bg-slate-100 text-slate-600';
        }
    }

    // Helper function to get action text
    const getActionText = (action: string) => {
        switch (action) {
            case 'created':
                return t('recentActivities.created');
            case 'updated':
                return t('recentActivities.updated');
            case 'deleted':
                return t('recentActivities.deleted');
            default:
                return action;
        }
    }

    // Helper function for time ago text
    const getTimeAgo = (timestamp: string) => {
        if (!mounted) return ""; // Return empty during SSR to avoid hydration mismatch

        try {
            const date = new Date(timestamp);
            const now = new Date();
            const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

            if (diffInSeconds < 60) return t('recentActivities.justNow');
            if (diffInSeconds < 3600) return t('recentActivities.minutesAgo', { minutes: Math.floor(diffInSeconds / 60) });
            if (diffInSeconds < 86400) return t('recentActivities.hoursAgo', { hours: Math.floor(diffInSeconds / 3600) });
            if (diffInSeconds < 172800) return t('recentActivities.yesterday');
            return format(date, 'MMM d');
        } catch (e) {
            return "";
        }
    }

    return (
        <Card>
            <CardHeader className="pb-2">
                <CardTitle className="text-lg font-semibold flex items-center space-x-2">
                    <Activity className="w-5 h-5 text-muted-foreground" />
                    <span>{t('recentActivities.title')}</span>
                </CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
                <div className="space-y-4">
                    {data.recentActivities.map((activity) => (
                        <div key={activity.id} className="flex items-start space-x-3">
                            <div className="mt-0.5">
                                <div className={`p-1.5 rounded-md ${getIconColorClass(activity.type)}`}>
                                    <Activity className="h-4 w-4" />
                                </div>
                            </div>
                            <div className="space-y-1 flex-1">
                                <p className="font-medium leading-none">
                                    {activity.description}
                                </p>
                                <div className="flex items-center justify-between">
                                    <p className="text-xs text-muted-foreground">
                                        {activity.user} {getActionText(activity.action)}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {getTimeAgo(activity.timestamp)}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}

                    {data.recentActivities.length === 0 && (
                        <div className="text-center py-6">
                            <p className="text-muted-foreground">
                                {t('recentActivities.noActivities')}
                            </p>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}