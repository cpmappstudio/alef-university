import { Users, GraduationCap, BookOpen, Briefcase, LucideIcon } from "lucide-react"
import { useTranslations } from "next-intl"
import { Badge } from '@/components/ui/badge'
import {
    Card,
    CardAction,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card'
import { getMockAdminMetrics } from './dashboard-data'
import { AdminMetrics } from './types'

interface MetricCardProps {
    title: string
    value: string
    badge: {
        icon: LucideIcon
        text: string
        variant?: "default" | "secondary" | "destructive" | "outline"
        className?: string
    }
    footer: {
        title: string
        description: string
        icon: LucideIcon
    }
    onClick?: () => void
}

function MetricCard({ title, value, badge, footer, onClick }: MetricCardProps) {
    const BadgeIcon = badge.icon
    const FooterIcon = footer.icon

    return (
        <Card
            className={`@container/card ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
            data-slot="card"
            onClick={onClick}
        >
            <CardHeader>
                <div className="text-sm text-muted-foreground">{title}</div>
                <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                    {value}
                </CardTitle>
                <CardAction>
                    <Badge variant={badge.variant || "outline"} className={badge.className}>
                        <BadgeIcon className="size-3" />
                        {badge.text}
                    </Badge>
                </CardAction>
            </CardHeader>
            <CardFooter className="flex-col items-start gap-1.5 text-sm">
                <div className="line-clamp-1 flex gap-2 font-medium">
                    {footer.title} <FooterIcon className="size-4" />
                </div>
                <div className="text-muted-foreground">
                    {footer.description}
                </div>
            </CardFooter>
        </Card>
    )
}

interface AdminMetricsGridProps {
    metricsData?: AdminMetrics
}

export default function AdminMetricsGrid({ metricsData }: AdminMetricsGridProps) {
    const t = useTranslations('dashboard.admin')

    // TODO: Replace with real Convex query
    // const metricsData = useQuery(api.adminDashboard.getMetrics)
    const data = metricsData || getMockAdminMetrics()

    const handleNavigate = (path: string) => {
        window.location.href = path
    }

    const metricsConfig: MetricCardProps[] = [
        {
            title: t('metrics.activeProfessors'),
            value: data.activeProfessors.toString(),
            badge: {
                icon: Users,
                text: t('metrics.teachingStaff')
            },
            footer: {
                title: t('metrics.manageStaff'),
                description: t('metrics.viewAllProfessors'),
                icon: Users
            },
            onClick: () => handleNavigate('/admin/professors')
        },
        {
            title: t('metrics.activeStudents'),
            value: data.activeStudents.toLocaleString(),
            badge: {
                icon: GraduationCap,
                text: `${data.totalEnrollments.toLocaleString()} ${t('metrics.enrollments')}`,
                variant: "outline",
                className: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
            },
            footer: {
                title: t('metrics.studentBody'),
                description: t('metrics.viewAllStudents'),
                icon: GraduationCap
            },
            onClick: () => handleNavigate('/admin/students')
        },
        {
            title: t('metrics.activeCourses'),
            value: data.activeCourses.toString(),
            badge: {
                icon: BookOpen,
                text: `${data.activeSections} ${t('metrics.sections')}`,
                variant: "outline",
                className: "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300"
            },
            footer: {
                title: t('metrics.courseCatalog'),
                description: t('metrics.viewAllCourses'),
                icon: BookOpen
            },
            onClick: () => handleNavigate('/admin/courses')
        },
        {
            title: t('metrics.activePrograms'),
            value: data.activePrograms.toString(),
            badge: {
                icon: Briefcase,
                text: t('metrics.academicPrograms'),
                variant: "outline",
                className: "bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300"
            },
            footer: {
                title: t('metrics.programManagement'),
                description: t('metrics.viewAllPrograms'),
                icon: Briefcase
            },
            onClick: () => handleNavigate('/admin/programs')
        }
    ]

    return (
        <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
            {metricsConfig.map((metric, index) => (
                <MetricCard key={index} {...metric} />
            ))}
        </div>
    )
}
