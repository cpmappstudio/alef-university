import { Calendar, Clock } from "lucide-react"
import { useTranslations } from "next-intl"
import { Badge } from '@/components/ui/badge'
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card'
import { getMockProfessorDashboardData } from './dashboard-data'
import { ProfessorDashboardData } from './types'

interface UpcomingClosingDatesCardProps {
    data?: ProfessorDashboardData
}

export default function UpcomingClosingDatesCard({ data: providedData }: UpcomingClosingDatesCardProps) {
    const t = useTranslations('dashboard.professor')

    // TODO: Replace with real Convex query
    const data = providedData || getMockProfessorDashboardData()

    const getUrgencyColor = (daysRemaining: number) => {
        if (daysRemaining <= 3) return "text-red-600 dark:text-red-400"
        if (daysRemaining <= 7) return "text-orange-600 dark:text-orange-400"
        return "text-blue-600 dark:text-blue-400"
    }

    const getUrgencyBadge = (daysRemaining: number) => {
        if (daysRemaining <= 3) return {
            variant: "destructive" as const,
            text: t('closingDates.urgent')
        }
        if (daysRemaining <= 7) return {
            variant: "default" as const,
            text: t('closingDates.soon')
        }
        return {
            variant: "outline" as const,
            text: t('closingDates.upcoming')
        }
    }

    return (
        <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs">
            <Card data-slot="card">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Calendar className="size-5" />
                        {t('closingDates.title')}
                    </CardTitle>
                    <CardDescription>
                        {t('closingDates.subtitle')}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {data.upcomingClosingDates.map((item, index) => {
                            const urgencyBadge = getUrgencyBadge(item.daysRemaining)
                            const urgencyColor = getUrgencyColor(item.daysRemaining)

                            return (
                                <div
                                    key={index}
                                    className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors cursor-pointer"
                                    onClick={() => window.location.href = `/teaching/gradebook`}
                                >
                                    <div className="flex-1 space-y-1">
                                        <div className="flex items-center gap-2">
                                            <span className="font-mono text-sm font-medium">
                                                {item.courseCode}
                                            </span>
                                            <Badge variant="outline" className="font-mono text-xs">
                                                G{item.groupNumber}
                                            </Badge>
                                            <Badge variant={urgencyBadge.variant} className="text-xs">
                                                {urgencyBadge.text}
                                            </Badge>
                                        </div>
                                        <p className="text-sm text-muted-foreground">
                                            {item.courseName}
                                        </p>
                                    </div>
                                    <div className="flex flex-col items-end gap-1 ml-4">
                                        <div className="flex items-center gap-2">
                                            <Clock className={`size-4 ${urgencyColor}`} />
                                            <span className={`text-sm font-medium ${urgencyColor}`}>
                                                {item.daysRemaining} {item.daysRemaining === 1 ? t('closingDates.day') : t('closingDates.days')}
                                            </span>
                                        </div>
                                        <span className="text-xs text-muted-foreground">
                                            {new Date(item.closingDate).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
