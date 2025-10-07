import { Calendar, AlertCircle, Clock } from "lucide-react"
import { useTranslations } from "next-intl"
import { Badge } from '@/components/ui/badge'
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card'
import { getMockAdminDashboardData } from './dashboard-data'
import { AdminDashboardData } from './types'

interface UpcomingDeadlinesCardProps {
    data?: AdminDashboardData
}

export default function UpcomingDeadlinesCard({ data: providedData }: UpcomingDeadlinesCardProps) {
    const t = useTranslations('dashboard.admin')

    // TODO: Replace with real Convex query
    const data = providedData || getMockAdminDashboardData()

    const getTypeVariant = (type: string): "default" | "secondary" | "destructive" | "outline" => {
        switch (type) {
            case 'enrollment': return 'default'
            case 'grading': return 'secondary'
            case 'period': return 'outline'
            default: return 'outline'
        }
    }

    const getTypeLabel = (type: string) => {
        switch (type) {
            case 'enrollment': return t('deadlines.enrollment')
            case 'grading': return t('deadlines.grading')
            case 'period': return t('deadlines.period')
            default: return t('deadlines.other')
        }
    }

    const getUrgencyColor = (daysRemaining: number) => {
        if (daysRemaining <= 7) return "text-red-600 dark:text-red-400"
        if (daysRemaining <= 14) return "text-orange-600 dark:text-orange-400"
        return "text-blue-600 dark:text-blue-400"
    }

    const getUrgencyBadge = (daysRemaining: number) => {
        if (daysRemaining <= 7) return {
            variant: "destructive" as const,
            text: t('deadlines.urgent')
        }
        if (daysRemaining <= 14) return {
            variant: "default" as const,
            text: t('deadlines.soon')
        }
        return {
            variant: "outline" as const,
            text: t('deadlines.upcoming')
        }
    }

    return (
        <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs">
            <Card data-slot="card">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Calendar className="size-5" />
                        {t('deadlines.title')}
                    </CardTitle>
                    <CardDescription>
                        {t('deadlines.subtitle')}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {data.upcomingDeadlines.map((deadline) => {
                            const urgencyBadge = getUrgencyBadge(deadline.daysRemaining)
                            const urgencyColor = getUrgencyColor(deadline.daysRemaining)

                            return (
                                <div
                                    key={deadline.id}
                                    className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                                >
                                    <div className="flex-1 space-y-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="font-medium">
                                                {deadline.title}
                                            </span>
                                            <Badge variant={getTypeVariant(deadline.type)} className="text-xs">
                                                {getTypeLabel(deadline.type)}
                                            </Badge>
                                            <Badge variant={urgencyBadge.variant} className="text-xs">
                                                {urgencyBadge.text}
                                            </Badge>
                                        </div>
                                        <p className="text-sm text-muted-foreground">
                                            {deadline.description}
                                        </p>
                                    </div>
                                    <div className="flex flex-col items-end gap-1 ml-4">
                                        <div className="flex items-center gap-2">
                                            <Clock className={`size-4 ${urgencyColor}`} />
                                            <span className={`text-sm font-medium ${urgencyColor}`}>
                                                {deadline.daysRemaining} {deadline.daysRemaining === 1 ? t('deadlines.day') : t('deadlines.days')}
                                            </span>
                                        </div>
                                        <span className="text-xs text-muted-foreground">
                                            {new Date(deadline.date).toLocaleDateString()}
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
