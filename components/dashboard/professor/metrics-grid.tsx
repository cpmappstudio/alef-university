import { BookOpen, Users, GraduationCap, TrendingUp, LucideIcon } from "lucide-react"
import { useTranslations } from "next-intl"
import { Badge } from '@/components/ui/badge'
import {
    Card,
    CardAction,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card'
import { getMockProfessorMetrics } from './dashboard-data'
import { ProfessorMetrics } from './types'

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
}

function MetricCard({ title, value, badge, footer }: MetricCardProps) {
    const BadgeIcon = badge.icon
    const FooterIcon = footer.icon

    return (
        <Card className="@container/card" data-slot="card">
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

interface MetricsGridProps {
    metricsData?: ProfessorMetrics
}

export default function ProfessorMetricsGrid({ metricsData }: MetricsGridProps) {
    const t = useTranslations('dashboard.professor')

    // TODO: Replace with real Convex query
    // const metricsData = useQuery(api.professorDashboard.getMetrics)
    const data = metricsData || getMockProfessorMetrics()

    const metricsConfig: MetricCardProps[] = [
        {
            title: t('metrics.currentSections'),
            value: data.totalSections.toString(),
            badge: {
                icon: BookOpen,
                text: `${data.totalCreditsTeaching} ${t('metrics.credits')}`
            },
            footer: {
                title: t('metrics.activeTeaching'),
                description: t('metrics.currentPeriod', { period: data.currentPeriod }),
                icon: BookOpen
            }
        },
        {
            title: t('metrics.totalStudents'),
            value: data.totalStudents.toString(),
            badge: {
                icon: Users,
                text: `${Math.round(data.averageEnrollment)} ${t('metrics.avgPerSection')}`,
                variant: "outline",
                className: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
            },
            footer: {
                title: t('metrics.studentEngagement'),
                description: t('metrics.sectionsEnrolled'),
                icon: Users
            }
        },
        {
            title: t('metrics.sectionsToGrade'),
            value: data.sectionsToGrade.toString(),
            badge: {
                icon: GraduationCap,
                text: data.sectionsToGrade > 0 ? t('metrics.actionRequired') : t('metrics.upToDate'),
                variant: data.sectionsToGrade > 0 ? "default" : "outline",
                className: data.sectionsToGrade > 0 ? "bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-300" : "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300"
            },
            footer: {
                title: data.sectionsToGrade > 0 ? t('metrics.gradingPending') : t('metrics.allGraded'),
                description: t('metrics.checkGradebook'),
                icon: GraduationCap
            }
        },
        {
            title: t('metrics.teachingExperience'),
            value: `${data.periodsTaught}`,
            badge: {
                icon: TrendingUp,
                text: `${data.totalStudentsTaught} ${t('metrics.studentsTaught')}`
            },
            footer: {
                title: t('metrics.experiencedEducator'),
                description: t('metrics.periodsTaughtTotal'),
                icon: TrendingUp
            }
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
