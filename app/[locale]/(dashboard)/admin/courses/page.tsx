import CourseTable from "@/components/admin/course/course-table";

export default function CourseManagementPage() {
  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="space-y-2">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
          Course Management
        </h1>
        <p className="text-muted-foreground text-base sm:text-lg">
          View and manage all academic courses in the system.
        </p>
      </div>

      {/* Main Content */}
      <CourseTable />
    </div>
  );
}
