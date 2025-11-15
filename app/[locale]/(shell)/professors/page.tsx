import ProfessorTable from "@/components/professor/professor-table";

export default function ProfessorManagementPage() {
  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="space-y-2">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
          Professor Management
        </h1>
        <p className="text-muted-foreground text-base sm:text-lg">
          View and manage all professors in the system.
        </p>
      </div>

      {/* Main Content */}
      <ProfessorTable />
    </div>
  );
}
