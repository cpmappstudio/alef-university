import AcademicHistoryTable from "@/components/student/academic-history-table";

export default function AcademicHistoryPage() {
    return (
        <div className="min-h-screen bg-background">
            {/* Header Section */}
            <div className="bg-card">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 py-6 sm:py-8">
                        <div className="space-y-3">
                            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
                                Academic History
                            </h1>
                            <p className="text-muted-foreground text-base sm:text-lg max-w-2xl">
                                Complete academic record with all courses taken, grades, and period summaries.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <AcademicHistoryTable />
            </div>
        </div>
    );
}
