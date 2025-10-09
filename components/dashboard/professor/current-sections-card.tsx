import Link from "next/link"
import { BookOpen, Clock, AlertCircle } from "lucide-react"
import { useTranslations } from "next-intl"
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { getMockProfessorDashboardData } from './dashboard-data'
import { ProfessorDashboardData, CurrentSection } from './types'
import { useState, useEffect } from 'react'

interface CurrentSectionsCardProps {
    data?: ProfessorDashboardData
}

export default function CurrentSectionsCard({ data: providedData }: CurrentSectionsCardProps) {
    const t = useTranslations('dashboard.professor')
    const [mounted, setMounted] = useState(false)

    // TODO: Replace with real Convex query
    // const data = useQuery(api.professorDashboard.getCurrentSections)
    const data = providedData || getMockProfessorDashboardData()

    useEffect(() => {
        setMounted(true)
    }, [])

    const getCategoryVariant = (category: CurrentSection['category']) => {
        switch (category) {
            case 'general': return 'secondary'
            case 'professional': return 'default'
            case 'specialty': return 'outline'
            default: return 'secondary'
        }
    }

    const getStatusVariant = (status: CurrentSection['status']) => {
        switch (status) {
            case 'active': return 'default'
            case 'grading': return 'secondary'
            case 'closed': return 'outline'
            default: return 'secondary'
        }
    }

    const getCategoryLabel = (category: CurrentSection['category']) => {
        switch (category) {
            case 'general': return t('currentSections.categoryGeneral')
            case 'professional': return t('currentSections.categoryProfessional')
            case 'specialty': return t('currentSections.categorySpecialty')
            default: return category
        }
    }

    const getStatusLabel = (status: CurrentSection['status']) => {
        switch (status) {
            case 'active': return t('currentSections.statusActive')
            case 'grading': return t('currentSections.statusGrading')
            case 'closed': return t('currentSections.statusClosed')
            default: return status
        }
    }

    const handleSectionClick = (section: CurrentSection) => {
        // Navigate to gradebook with section filter
        window.location.href = `/teaching/gradebook?section=${section.id}`
    }

    return (
        <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs">
            <Card data-slot="card">
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <BookOpen className="size-5" />
                            {t('currentSections.title')}
                        </CardTitle>
                    </div>
                    <Link href="/teaching/gradebook">
                        <Button variant="outline" size="sm">
                            {t('currentSections.viewGradebook')}
                        </Button>
                    </Link>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t('currentSections.code')}</TableHead>
                                <TableHead>{t('currentSections.course')}</TableHead>
                                <TableHead className="text-center">{t('currentSections.group')}</TableHead>
                                <TableHead className="text-center hidden md:table-cell">{t('currentSections.students')}</TableHead>
                                <TableHead className="hidden lg:table-cell">{t('currentSections.category')}</TableHead>
                                <TableHead className="hidden xl:table-cell">{t('currentSections.closingDate')}</TableHead>
                                <TableHead className="text-center">{t('currentSections.status')}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {data.sections.map((section) => {
                                // Only calculate dates on client to avoid hydration mismatch
                                const closingDate = new Date(section.closingDate)
                                let daysUntilClosing = 0
                                let isClosingSoon = false

                                if (mounted) {
                                    const today = new Date()
                                    daysUntilClosing = Math.ceil((closingDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
                                    isClosingSoon = daysUntilClosing <= 7
                                }

                                return (
                                    <TableRow
                                        key={section.id}
                                        className="cursor-pointer hover:bg-muted/50"
                                        onClick={() => handleSectionClick(section)}
                                    >
                                        <TableCell className="font-mono font-medium">
                                            {section.courseCode}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="font-medium">{section.courseName}</span>
                                                {section.schedule && (
                                                    <span className="text-xs text-muted-foreground hidden sm:inline">
                                                        {section.schedule}
                                                    </span>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Badge variant="outline" className="font-mono">
                                                G{section.groupNumber}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-center font-medium hidden md:table-cell">
                                            {section.enrolledStudents}
                                        </TableCell>
                                        <TableCell className="hidden lg:table-cell">
                                            <Badge variant={getCategoryVariant(section.category)}>
                                                {getCategoryLabel(section.category)}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="hidden xl:table-cell">
                                            <div className="flex items-center gap-2">
                                                {isClosingSoon && (
                                                    <AlertCircle className="size-4 text-orange-600" />
                                                )}
                                                <span className={isClosingSoon ? "text-orange-600 font-medium" : ""}>
                                                    {closingDate.toLocaleDateString()}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Badge variant={getStatusVariant(section.status)}>
                                                {getStatusLabel(section.status)}
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                )
                            })}
                        </TableBody>
                    </Table>
                </CardContent>
                <CardFooter>
                    <CardDescription>
                        {t('currentSections.subtitle', {
                            period: data.currentPeriod,
                            sections: data.totalSections,
                            students: data.totalStudents
                        })}
                    </CardDescription>
                </CardFooter>
            </Card>
        </div>
    )
}
