import ProgramTable from "@/components/admin/program/program-table";

export default function ProgramManagementPage() {
  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="space-y-2">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
          Program Management
        </h1>
        <p className="text-muted-foreground text-base sm:text-lg">
          View and manage all academic programs in the system.
        </p>
      </div>

      {/* Main Content */}
      <ProgramTable />
    </div>
  );
}
