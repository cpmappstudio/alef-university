import CourseTable from "@/components/admin/program/course-table";
import ProgramTable from "@/components/admin/program/program-table";
import SectionsTable from "@/components/admin/program/sections-table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function ProgramManagementPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header Section */}
      <div className="bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 py-6 sm:py-8">
            <div className="space-y-3">
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
                Academic Programs
              </h1>
              <p className="text-muted-foreground text-base sm:text-lg max-w-2xl">
                Manage and organize your university's academic programs, courses, and sections.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="space-y-6 sm:space-y-8">
          <Tabs defaultValue="programs" className="w-full">
            {/* Enhanced Tabs Navigation */}
            <div className="mb-6 sm:mb-8">
              <TabsList className="grid w-full max-w-md grid-cols-3 h-11 bg-muted/50 p-1 rounded-lg shadow-sm">
                <TabsTrigger 
                  value="programs" 
                  className="text-sm font-medium transition-all duration-200 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
                >
                  Programs
                </TabsTrigger>
                <TabsTrigger 
                  value="courses" 
                  className="text-sm font-medium transition-all duration-200 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
                >
                  Courses
                </TabsTrigger>
                <TabsTrigger 
                  value="sections" 
                  className="text-sm font-medium transition-all duration-200 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
                >
                  Sections
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Tab Content with enhanced spacing and styling */}
            <div className="space-y-6">
              <TabsContent value="programs" className="space-y-6 mt-0">
                <div className="bg-card rounded-xl border border-border/50 shadow-sm overflow-hidden">
                  <ProgramTable />
                </div>
              </TabsContent>
              
              <TabsContent value="courses" className="space-y-6 mt-0">
                <div className="bg-card rounded-xl border border-border/50 shadow-sm overflow-hidden">
                  <CourseTable />
                </div>
              </TabsContent>
              
              <TabsContent value="sections" className="space-y-6 mt-0">
                <div className="bg-card rounded-xl border border-border/50 shadow-sm overflow-hidden">
                  <SectionsTable />
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
