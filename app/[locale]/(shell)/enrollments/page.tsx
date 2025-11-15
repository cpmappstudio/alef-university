import EnrollmentTable from "@/components/enrollment/enrollment-table";

export default function EnrollmentManagementPage() {
  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="space-y-2">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
          Enrollment Management
        </h1>
        <p className="text-muted-foreground text-base sm:text-lg">
          View and manage all student enrollments in the system.
        </p>
      </div>

      {/* Main Content */}
      <EnrollmentTable />
    </div>
  );
}
