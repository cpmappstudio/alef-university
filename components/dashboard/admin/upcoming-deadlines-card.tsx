import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarClock, CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";
import { AdminDashboardData } from "./types";
import { getMockAdminDashboardData } from "./dashboard-data";

interface UpcomingDeadlinesCardProps {
    data?: AdminDashboardData
}

export default function UpcomingDeadlinesCard({ data: providedData }: UpcomingDeadlinesCardProps) {
    const t = useTranslations('dashboard.admin')

    // Use real data if provided, otherwise use mock data
    const data = providedData?.upcomingDeadlines?.length 
        ? { upcomingDeadlines: providedData.upcomingDeadlines }
        : getMockAdminDashboardData();
    
    return (
        <Card>
            <CardHeader className="pb-2">
                <CardTitle className="text-lg font-semibold flex items-center space-x-2">
                    <CalendarClock className="w-5 h-5 text-muted-foreground" />
                    <span>{t('upcomingDeadlines.title')}</span>
                </CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
                <div className="space-y-4">
                    {data.upcomingDeadlines.map((deadline) => (
                        <div key={deadline.id} className="flex items-start space-x-3">
                            <div className="mt-0.5">
                                <div className={cn(
                                    "p-1.5 rounded-md",
                                    deadline.daysRemaining <= 3 ? "bg-red-100" :
                                        deadline.daysRemaining <= 7 ? "bg-amber-100" : "bg-blue-100"
                                )}>
                                    <CalendarDays className={cn(
                                        "h-4 w-4",
                                        deadline.daysRemaining <= 3 ? "text-red-600" :
                                            deadline.daysRemaining <= 7 ? "text-amber-600" : "text-blue-600"
                                    )} />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <p className="font-medium leading-none">
                                    {deadline.title}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    {deadline.description}
                                </p>
                                <div className="flex items-center space-x-2">
                                    <p className="text-xs text-muted-foreground">
                                        {new Date(deadline.date).toLocaleDateString()}
                                    </p>
                                    <span className="text-xs px-1.5 py-0.5 rounded-full bg-muted">
                                        {deadline.daysRemaining === 0
                                            ? t('upcomingDeadlines.today')
                                            : deadline.daysRemaining === 1
                                                ? t('upcomingDeadlines.tomorrow')
                                                : t('upcomingDeadlines.inXDays', { days: deadline.daysRemaining })}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                    
                    {data.upcomingDeadlines.length === 0 && (
                        <div className="text-center py-6">
                            <p className="text-muted-foreground">
                                {t('upcomingDeadlines.noDeadlines')}
                            </p>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}