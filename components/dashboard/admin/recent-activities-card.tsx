import { Activity, UserPlus, BookPlus, Users, GraduationCap, FileEdit, Trash2 } from "lucide-react"
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
import { AdminDashboardData, RecentActivity } from './types'

interface RecentActivitiesCardProps {
    data?: AdminDashboardData
}

export default function RecentActivitiesCard({ data: providedData }: RecentActivitiesCardProps) {
    const t = useTranslations('dashboard.admin')

    // TODO: Replace with real Convex query
    const data = providedData || getMockAdminDashboardData()

    const getActivityIcon = (type: RecentActivity['type']) => {
        switch (type) {
            case 'enrollment': return BookPlus
            case 'professor': return UserPlus
            case 'student': return GraduationCap
            case 'course': return BookPlus
            case 'program': return Users
            default: return Activity
        }
    }

    const getActionIcon = (action: RecentActivity['action']) => {
        switch (action) {
            case 'created': return UserPlus
            case 'updated': return FileEdit
            case 'deleted': return Trash2
            default: return Activity
        }
    }

    const getActionVariant = (action: RecentActivity['action']): "default" | "secondary" | "destructive" | "outline" => {
        switch (action) {
            case 'created': return 'default'
            case 'updated': return 'secondary'
            case 'deleted': return 'destructive'
            default: return 'outline'
        }
    }

    const getActionLabel = (action: RecentActivity['action']) => {
        switch (action) {
            case 'created': return t('activities.created')
            case 'updated': return t('activities.updated')
            case 'deleted': return t('activities.deleted')
            default: return action
        }
    }

    const getTypeColor = (type: RecentActivity['type']) => {
        switch (type) {
            case 'enrollment': return 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950'
            case 'professor': return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950'
            case 'student': return 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950'
            case 'course': return 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950'
            case 'program': return 'text-pink-600 dark:text-pink-400 bg-pink-50 dark:bg-pink-950'
            default: return 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-950'
        }
    }

    const formatTimestamp = (timestamp: string) => {
        const date = new Date(timestamp)
        const now = new Date()
        const diff = now.getTime() - date.getTime()
        const minutes = Math.floor(diff / 60000)
        const hours = Math.floor(diff / 3600000)
        const days = Math.floor(diff / 86400000)

        if (minutes < 60) return t('activities.minutesAgo', { count: minutes })
        if (hours < 24) return t('activities.hoursAgo', { count: hours })
        return t('activities.daysAgo', { count: days })
    }

    return (
        <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs">
            <Card data-slot="card">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Activity className="size-5" />
                        {t('activities.title')}
                    </CardTitle>
                    <CardDescription>
                        {t('activities.subtitle')}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {data.recentActivities.map((activity) => {
                            const ActivityIcon = getActivityIcon(activity.type)
                            const ActionIcon = getActionIcon(activity.action)

                            return (
                                <div
                                    key={activity.id}
                                    className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                                >
                                    <div className={`p-2 rounded-lg ${getTypeColor(activity.type)}`}>
                                        <ActivityIcon className="size-4" />
                                    </div>
                                    <div className="flex-1 space-y-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <Badge variant={getActionVariant(activity.action)} className="text-xs">
                                                <ActionIcon className="size-3 mr-1" />
                                                {getActionLabel(activity.action)}
                                            </Badge>
                                            <span className="text-xs text-muted-foreground">
                                                {formatTimestamp(activity.timestamp)}
                                            </span>
                                        </div>
                                        <p className="text-sm font-medium">
                                            {activity.description}
                                        </p>
                                        {activity.user && (
                                            <p className="text-xs text-muted-foreground">
                                                {t('activities.by')} {activity.user}
                                            </p>
                                        )}
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
