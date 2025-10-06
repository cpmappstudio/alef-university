"use client"

import ProfessorMetricsGrid from './professor/metrics-grid'
import CurrentSectionsCard from './professor/current-sections-card'
import UpcomingClosingDatesCard from './professor/upcoming-closing-dates-card'

export default function ProfessorDashboard() {
    // TODO: Replace with real Convex queries
    // Each component now handles its own data fetching independently
    // This prevents blocking the entire dashboard if one query is slow

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="@container/main space-y-4 md:space-y-6 py-6">
                <ProfessorMetricsGrid />
                <CurrentSectionsCard />
                <UpcomingClosingDatesCard />
            </div>
        </div>
    )
}
