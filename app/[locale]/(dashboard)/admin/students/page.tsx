import StudentTable from "@/components/admin/student/student-table";

export default function ProfessorManagementPage() {
    return (
        <div className="min-h-screen bg-background">
              {/* Header Section */}
              <div className="bg-card">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 py-6 sm:py-8">
                    <div className="space-y-3">
                      <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
                        Student Management
                      </h1>
                      <p className="text-muted-foreground text-base sm:text-lg max-w-2xl">
                        View and manage all students in the system.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
        
              {/* Main Content */}
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <StudentTable />
              </div>
            </div>
    );
}
