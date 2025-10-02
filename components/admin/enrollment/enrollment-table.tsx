"use client";

import * as React from "react";
import { columnsEnrollment } from "../columns";
import { DataTable } from "../../ui/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Plus,
  Filter,
  ChevronDown,
  Check,
  ChevronsUpDown,
  Search,
} from "lucide-react";
import { Enrollment } from "../types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Id } from "@/convex/_generated/dataModel";
import { EnrollmentFormDialog } from "./enrollment-form-dialog";

type EnrollmentStatusFilter = 
  | "all" 
  | "enrolled" 
  | "withdrawn" 
  | "dropped" 
  | "completed" 
  | "failed" 
  | "incomplete" 
  | "in_progress";

// Mock data types for demo purposes (not consuming real queries)
type MockStudent = {
  _id: Id<"users">;
  name: string;
  email: string;
};

type MockCourse = {
  _id: Id<"courses">;
  code: string;
  nameEs: string;
};

type MockSection = {
  _id: Id<"sections">;
  groupNumber: string;
  courseCode: string;
};

type MockPeriod = {
  _id: Id<"periods">;
  code: string;
  nameEs: string;
};

export default function EnrollmentTable() {
  const [nameSearch, setNameSearch] = React.useState("");
  
  // Student filter states
  const [selectedStudentId, setSelectedStudentId] = React.useState<
    Id<"users"> | "all" | undefined
  >("all");
  const [studentSearchOpen, setStudentSearchOpen] = React.useState(false);
  const [studentSearchValue, setStudentSearchValue] = React.useState("");
  
  // Course filter states
  const [selectedCourseId, setSelectedCourseId] = React.useState<
    Id<"courses"> | "all" | undefined
  >("all");
  const [courseSearchOpen, setCourseSearchOpen] = React.useState(false);
  const [courseSearchValue, setCourseSearchValue] = React.useState("");
  
  // Section filter states
  const [selectedSectionId, setSelectedSectionId] = React.useState<
    Id<"sections"> | "all" | undefined
  >("all");
  const [sectionSearchOpen, setSectionSearchOpen] = React.useState(false);
  const [sectionSearchValue, setSectionSearchValue] = React.useState("");
  
  // Period filter states
  const [selectedPeriodId, setSelectedPeriodId] = React.useState<
    Id<"periods"> | "all" | undefined
  >("all");
  const [periodSearchOpen, setPeriodSearchOpen] = React.useState(false);
  const [periodSearchValue, setPeriodSearchValue] = React.useState("");
  
  // Status filter
  const [enrollmentStatusFilter, setEnrollmentStatusFilter] =
    React.useState<EnrollmentStatusFilter>("all");
  
  // Dialog states
  const [selectedEnrollment, setSelectedEnrollment] = React.useState<
    Enrollment | undefined
  >();
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = React.useState(false);

  // Mock data for demo purposes (since no queries should be consumed)
  const mockStudents: MockStudent[] = [
    { _id: "student1" as Id<"users">, name: "María García", email: "maria.garcia@alef.edu" },
    { _id: "student2" as Id<"users">, name: "Juan Pérez", email: "juan.perez@alef.edu" },
    { _id: "student3" as Id<"users">, name: "Ana López", email: "ana.lopez@alef.edu" },
    { _id: "student4" as Id<"users">, name: "Carlos Rodríguez", email: "carlos.rodriguez@alef.edu" },
    { _id: "student5" as Id<"users">, name: "Sofia Martinez", email: "sofia.martinez@alef.edu" },
  ];

  const mockCourses: MockCourse[] = [
    { _id: "course1" as Id<"courses">, code: "MATH101", nameEs: "Matemáticas Básicas" },
    { _id: "course2" as Id<"courses">, code: "HIST201", nameEs: "Historia Universal" },
    { _id: "course3" as Id<"courses">, code: "ENG301", nameEs: "Inglés Avanzado" },
    { _id: "course4" as Id<"courses">, code: "CS102", nameEs: "Fundamentos de Programación" },
    { _id: "course5" as Id<"courses">, code: "BIO150", nameEs: "Biología General" },
  ];

  const mockSections: MockSection[] = [
    { _id: "section1" as Id<"sections">, groupNumber: "A01", courseCode: "MATH101" },
    { _id: "section2" as Id<"sections">, groupNumber: "B02", courseCode: "HIST201" },
    { _id: "section3" as Id<"sections">, groupNumber: "C03", courseCode: "ENG301" },
    { _id: "section4" as Id<"sections">, groupNumber: "A01", courseCode: "CS102" },
    { _id: "section5" as Id<"sections">, groupNumber: "B01", courseCode: "BIO150" },
  ];

  const mockPeriods: MockPeriod[] = [
    { _id: "period1" as Id<"periods">, code: "2025-1", nameEs: "Primer Bimestre 2025" },
    { _id: "period2" as Id<"periods">, code: "2025-2", nameEs: "Segundo Bimestre 2025" },
    { _id: "period3" as Id<"periods">, code: "2024-6", nameEs: "Sexto Bimestre 2024" },
  ];

  const mockProfessors = [
    { _id: "prof1" as Id<"users">, name: "Dr. Elena Vásquez" },
    { _id: "prof2" as Id<"users">, name: "Prof. Miguel Santos" },
    { _id: "prof3" as Id<"users">, name: "Dra. Carmen Flores" },
    { _id: "prof4" as Id<"users">, name: "Prof. Roberto Luna" },
    { _id: "prof5" as Id<"users">, name: "Dr. Patricia Morales" },
  ];

  // Enhanced mock enrollments with extended properties for column display
  const mockEnrollments = React.useMemo(() => {
    const baseEnrollments: Enrollment[] = [
      {
        _id: "enrollment1" as Id<"enrollments">,
        studentId: "student1" as Id<"users">,
        sectionId: "section1" as Id<"sections">,
        periodId: "period1" as Id<"periods">,
        courseId: "course1" as Id<"courses">,
        professorId: "prof1" as Id<"users">,
        enrolledAt: Date.now(),
        status: "completed",
        letterGrade: "A",
        isRetake: false,
        isAuditing: false,
        countsForGPA: true,
        countsForProgress: true,
        createdAt: Date.now(),
      } as Enrollment,
      {
        _id: "enrollment2" as Id<"enrollments">,
        studentId: "student2" as Id<"users">,
        sectionId: "section2" as Id<"sections">,
        periodId: "period1" as Id<"periods">,
        courseId: "course2" as Id<"courses">,
        professorId: "prof2" as Id<"users">,
        enrolledAt: Date.now(),
        status: "in_progress",
        letterGrade: "B+",
        isRetake: true,
        isAuditing: false,
        countsForGPA: true,
        countsForProgress: true,
        createdAt: Date.now(),
      } as Enrollment,
      {
        _id: "enrollment3" as Id<"enrollments">,
        studentId: "student3" as Id<"users">,
        sectionId: "section3" as Id<"sections">,
        periodId: "period2" as Id<"periods">,
        courseId: "course3" as Id<"courses">,
        professorId: "prof3" as Id<"users">,
        enrolledAt: Date.now(),
        status: "enrolled",
        isRetake: false,
        isAuditing: false,
        countsForGPA: true,
        countsForProgress: true,
        createdAt: Date.now(),
      } as Enrollment,
      {
        _id: "enrollment4" as Id<"enrollments">,
        studentId: "student4" as Id<"users">,
        sectionId: "section4" as Id<"sections">,
        periodId: "period1" as Id<"periods">,
        courseId: "course4" as Id<"courses">,
        professorId: "prof4" as Id<"users">,
        enrolledAt: Date.now(),
        status: "failed",
        letterGrade: "F",
        isRetake: false,
        isAuditing: false,
        countsForGPA: true,
        countsForProgress: true,
        createdAt: Date.now(),
      } as Enrollment,
      {
        _id: "enrollment5" as Id<"enrollments">,
        studentId: "student5" as Id<"users">,
        sectionId: "section5" as Id<"sections">,
        periodId: "period2" as Id<"periods">,
        courseId: "course5" as Id<"courses">,
        professorId: "prof5" as Id<"users">,
        enrolledAt: Date.now(),
        status: "dropped",
        isRetake: false,
        isAuditing: false,
        countsForGPA: false,
        countsForProgress: false,
        createdAt: Date.now(),
      } as Enrollment,
    ];

    // Add extended properties that columns expect
    return baseEnrollments.map(enrollment => ({
      ...enrollment,
      // Add student info
      studentName: mockStudents.find(s => s._id === enrollment.studentId)?.name || "Unknown Student",
      // Add course info 
      courseName: mockCourses.find(c => c._id === enrollment.courseId)?.nameEs || "Unknown Course",
      // Add section info
      sectionInfo: {
        groupNumber: mockSections.find(s => s._id === enrollment.sectionId)?.groupNumber || "N/A"
      },
      // Add period info
      periodInfo: {
        nameEs: mockPeriods.find(p => p._id === enrollment.periodId)?.nameEs || "Unknown Period"
      },
      // Add professor info
      professorName: mockProfessors.find(p => p._id === enrollment.professorId)?.name || "TBD",
    }));
  }, []);

  // Filter enrollments based on all active filters
  const filteredEnrollments = React.useMemo(() => {
    return mockEnrollments.filter((enrollment) => {
      // Name search filter (search in student name)
      const student = mockStudents.find(s => s._id === enrollment.studentId);
      const nameMatch =
        nameSearch === "" ||
        (enrollment as any).studentName?.toLowerCase().includes(nameSearch.toLowerCase()) ||
        student?.email?.toLowerCase().includes(nameSearch.toLowerCase());

      // Student filter
      const studentMatch =
        selectedStudentId === "all" || enrollment.studentId === selectedStudentId;

      // Course filter
      const courseMatch =
        selectedCourseId === "all" || enrollment.courseId === selectedCourseId;

      // Section filter
      const sectionMatch =
        selectedSectionId === "all" || enrollment.sectionId === selectedSectionId;

      // Period filter
      const periodMatch =
        selectedPeriodId === "all" || enrollment.periodId === selectedPeriodId;

      // Status filter
      const statusMatch =
        enrollmentStatusFilter === "all" || enrollment.status === enrollmentStatusFilter;

      return (
        nameMatch && studentMatch && courseMatch && sectionMatch && periodMatch && statusMatch
      );
    });
  }, [
    mockEnrollments,
    nameSearch,
    selectedStudentId,
    selectedCourseId,
    selectedSectionId,
    selectedPeriodId,
    enrollmentStatusFilter,
  ]);

  const handleRowClick = (enrollment: Enrollment) => {
    setSelectedEnrollment(enrollment);
    setIsEditDialogOpen(true);
  };

  const handleDialogClose = () => {
    setIsEditDialogOpen(false);
    setSelectedEnrollment(undefined);
  };

  const handleCreateDialogClose = () => {
    setIsCreateDialogOpen(false);
  };

  // Count active filters
  const activeFiltersCount = React.useMemo(() => {
    let count = 0;
    if (selectedStudentId !== "all") count++;
    if (selectedCourseId !== "all") count++;
    if (selectedSectionId !== "all") count++;
    if (selectedPeriodId !== "all") count++;
    if (enrollmentStatusFilter !== "all") count++;
    return count;
  }, [
    selectedStudentId,
    selectedCourseId,
    selectedSectionId,
    selectedPeriodId,
    enrollmentStatusFilter,
  ]);

  // Get selected names for display
  const selectedStudentName = React.useMemo(() => {
    if (selectedStudentId === "all") return "All Students";
    const student = mockStudents?.find((s) => s._id === selectedStudentId);
    return student ? student.name : "All Students";
  }, [selectedStudentId]);

  const selectedCourseName = React.useMemo(() => {
    if (selectedCourseId === "all") return "All Courses";
    const course = mockCourses?.find((c) => c._id === selectedCourseId);
    return course ? `${course.code} - ${course.nameEs}` : "All Courses";
  }, [selectedCourseId]);

  const selectedSectionName = React.useMemo(() => {
    if (selectedSectionId === "all") return "All Sections";
    const section = mockSections?.find((s) => s._id === selectedSectionId);
    return section ? `${section.groupNumber} (${section.courseCode})` : "All Sections";
  }, [selectedSectionId]);

  const selectedPeriodName = React.useMemo(() => {
    if (selectedPeriodId === "all") return "All Periods";
    const period = mockPeriods?.find((p) => p._id === selectedPeriodId);
    return period ? `${period.code} - ${period.nameEs}` : "All Periods";
  }, [selectedPeriodId]);

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Integrated Container - Header and Data Table */}
      <div className="bg-card rounded-xl border border-border/50 shadow-sm overflow-hidden mx-1 sm:mx-0">
        {/* Header Section with Filters */}
        <div className="p-3 sm:p-4 lg:p-6 border-b border-border/30 bg-card">
          <div className="space-y-4">
            {/* Header with Title and Filters */}
            <div className="space-y-4">
              {/* Filters Section */}
              <div className="space-y-4">
                {/* Filters Section */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  {/* Name Search */}
                  <div className="flex-1 w-full sm:w-auto">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search enrollments by student name, email..."
                        value={nameSearch}
                        onChange={(e) => setNameSearch(e.target.value)}
                        className="pl-10 h-10 bg-background border-border/50 shadow-sm transition-colors focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                  </div>

                  {/* Filters Dropdown and Clear Button */}
                  <div className="flex items-center gap-3">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          className="h-10 px-3 border-border/50 shadow-sm transition-colors hover:bg-accent/50"
                        >
                          <Filter className="h-4 w-4" />
                          {activeFiltersCount > 0 && (
                            <span className="ml-2 bg-primary text-primary-foreground text-xs rounded-full px-2 py-0.5 min-w-[1.25rem] h-5 flex items-center justify-center">
                              {activeFiltersCount}
                            </span>
                          )}
                          <ChevronDown className="h-4 w-4 ml-2" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-80 p-4" align="end">
                        <div className="space-y-4">
                          {/* Student Filter */}
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">
                              Student
                            </label>
                            <Popover
                              open={studentSearchOpen}
                              onOpenChange={setStudentSearchOpen}
                            >
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  role="combobox"
                                  aria-expanded={studentSearchOpen}
                                  className="w-full h-9 justify-between bg-background border-border/50 shadow-sm transition-colors hover:bg-accent/50"
                                >
                                  <span className="truncate">
                                    {selectedStudentName}
                                  </span>
                                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent
                                className="w-full p-0"
                                align="start"
                              >
                                <Command>
                                  <CommandInput
                                    placeholder="Search students..."
                                    value={studentSearchValue}
                                    onValueChange={setStudentSearchValue}
                                  />
                                  <CommandList>
                                    <CommandEmpty>
                                      No students found.
                                    </CommandEmpty>
                                    <CommandGroup>
                                      <CommandItem
                                        value="all"
                                        onSelect={() => {
                                          setSelectedStudentId("all");
                                          setStudentSearchValue("");
                                          setStudentSearchOpen(false);
                                        }}
                                      >
                                        <Check
                                          className={`mr-2 h-4 w-4 ${
                                            selectedStudentId === "all"
                                              ? "opacity-100"
                                              : "opacity-0"
                                          }`}
                                        />
                                        All
                                      </CommandItem>
                                      {mockStudents
                                        ?.filter((student) => {
                                          if (!studentSearchValue) {
                                            return mockStudents.slice(0, 3).includes(student);
                                          }
                                          const searchLower = studentSearchValue.toLowerCase();
                                          return (
                                            student.name.toLowerCase().includes(searchLower) ||
                                            student.email.toLowerCase().includes(searchLower)
                                          );
                                        })
                                        .map((student) => (
                                          <CommandItem
                                            key={student._id}
                                            value={`${student.name} ${student.email}`}
                                            onSelect={() => {
                                              setSelectedStudentId(student._id);
                                              setStudentSearchValue("");
                                              setStudentSearchOpen(false);
                                            }}
                                          >
                                            <Check
                                              className={`mr-2 h-4 w-4 ${
                                                selectedStudentId === student._id
                                                  ? "opacity-100"
                                                  : "opacity-0"
                                              }`}
                                            />
                                            {student.name}
                                          </CommandItem>
                                        ))}
                                    </CommandGroup>
                                  </CommandList>
                                </Command>
                              </PopoverContent>
                            </Popover>
                          </div>

                          {/* Course Filter */}
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">
                              Course
                            </label>
                            <Popover
                              open={courseSearchOpen}
                              onOpenChange={setCourseSearchOpen}
                            >
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  role="combobox"
                                  aria-expanded={courseSearchOpen}
                                  className="w-full h-9 justify-between bg-background border-border/50 shadow-sm transition-colors hover:bg-accent/50"
                                >
                                  <span className="truncate">
                                    {selectedCourseName}
                                  </span>
                                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent
                                className="w-full p-0"
                                align="start"
                              >
                                <Command>
                                  <CommandInput
                                    placeholder="Search courses..."
                                    value={courseSearchValue}
                                    onValueChange={setCourseSearchValue}
                                  />
                                  <CommandList>
                                    <CommandEmpty>
                                      No courses found.
                                    </CommandEmpty>
                                    <CommandGroup>
                                      <CommandItem
                                        value="all"
                                        onSelect={() => {
                                          setSelectedCourseId("all");
                                          setCourseSearchValue("");
                                          setCourseSearchOpen(false);
                                        }}
                                      >
                                        <Check
                                          className={`mr-2 h-4 w-4 ${
                                            selectedCourseId === "all"
                                              ? "opacity-100"
                                              : "opacity-0"
                                          }`}
                                        />
                                        All
                                      </CommandItem>
                                      {mockCourses
                                        ?.filter((course) => {
                                          if (!courseSearchValue) {
                                            return mockCourses.slice(0, 3).includes(course);
                                          }
                                          const searchLower = courseSearchValue.toLowerCase();
                                          return (
                                            course.code.toLowerCase().includes(searchLower) ||
                                            course.nameEs.toLowerCase().includes(searchLower)
                                          );
                                        })
                                        .map((course) => (
                                          <CommandItem
                                            key={course._id}
                                            value={`${course.code} ${course.nameEs}`}
                                            onSelect={() => {
                                              setSelectedCourseId(course._id);
                                              setCourseSearchValue("");
                                              setCourseSearchOpen(false);
                                            }}
                                          >
                                            <Check
                                              className={`mr-2 h-4 w-4 ${
                                                selectedCourseId === course._id
                                                  ? "opacity-100"
                                                  : "opacity-0"
                                              }`}
                                            />
                                            {course.code} - {course.nameEs}
                                          </CommandItem>
                                        ))}
                                    </CommandGroup>
                                  </CommandList>
                                </Command>
                              </PopoverContent>
                            </Popover>
                          </div>

                          {/* Section Filter */}
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">
                              Section
                            </label>
                            <Popover
                              open={sectionSearchOpen}
                              onOpenChange={setSectionSearchOpen}
                            >
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  role="combobox"
                                  aria-expanded={sectionSearchOpen}
                                  className="w-full h-9 justify-between bg-background border-border/50 shadow-sm transition-colors hover:bg-accent/50"
                                >
                                  <span className="truncate">
                                    {selectedSectionName}
                                  </span>
                                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent
                                className="w-full p-0"
                                align="start"
                              >
                                <Command>
                                  <CommandInput
                                    placeholder="Search sections..."
                                    value={sectionSearchValue}
                                    onValueChange={setSectionSearchValue}
                                  />
                                  <CommandList>
                                    <CommandEmpty>
                                      No sections found.
                                    </CommandEmpty>
                                    <CommandGroup>
                                      <CommandItem
                                        value="all"
                                        onSelect={() => {
                                          setSelectedSectionId("all");
                                          setSectionSearchValue("");
                                          setSectionSearchOpen(false);
                                        }}
                                      >
                                        <Check
                                          className={`mr-2 h-4 w-4 ${
                                            selectedSectionId === "all"
                                              ? "opacity-100"
                                              : "opacity-0"
                                          }`}
                                        />
                                        All
                                      </CommandItem>
                                      {mockSections
                                        ?.filter((section) => {
                                          if (!sectionSearchValue) {
                                            return mockSections.slice(0, 3).includes(section);
                                          }
                                          const searchLower = sectionSearchValue.toLowerCase();
                                          return (
                                            section.groupNumber.toLowerCase().includes(searchLower) ||
                                            section.courseCode.toLowerCase().includes(searchLower)
                                          );
                                        })
                                        .map((section) => (
                                          <CommandItem
                                            key={section._id}
                                            value={`${section.groupNumber} ${section.courseCode}`}
                                            onSelect={() => {
                                              setSelectedSectionId(section._id);
                                              setSectionSearchValue("");
                                              setSectionSearchOpen(false);
                                            }}
                                          >
                                            <Check
                                              className={`mr-2 h-4 w-4 ${
                                                selectedSectionId === section._id
                                                  ? "opacity-100"
                                                  : "opacity-0"
                                              }`}
                                            />
                                            {section.groupNumber} ({section.courseCode})
                                          </CommandItem>
                                        ))}
                                    </CommandGroup>
                                  </CommandList>
                                </Command>
                              </PopoverContent>
                            </Popover>
                          </div>

                          {/* Period Filter */}
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">
                              Period
                            </label>
                            <Popover
                              open={periodSearchOpen}
                              onOpenChange={setPeriodSearchOpen}
                            >
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  role="combobox"
                                  aria-expanded={periodSearchOpen}
                                  className="w-full h-9 justify-between bg-background border-border/50 shadow-sm transition-colors hover:bg-accent/50"
                                >
                                  <span className="truncate">
                                    {selectedPeriodName}
                                  </span>
                                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent
                                className="w-full p-0"
                                align="start"
                              >
                                <Command>
                                  <CommandInput
                                    placeholder="Search periods..."
                                    value={periodSearchValue}
                                    onValueChange={setPeriodSearchValue}
                                  />
                                  <CommandList>
                                    <CommandEmpty>
                                      No periods found.
                                    </CommandEmpty>
                                    <CommandGroup>
                                      <CommandItem
                                        value="all"
                                        onSelect={() => {
                                          setSelectedPeriodId("all");
                                          setPeriodSearchValue("");
                                          setPeriodSearchOpen(false);
                                        }}
                                      >
                                        <Check
                                          className={`mr-2 h-4 w-4 ${
                                            selectedPeriodId === "all"
                                              ? "opacity-100"
                                              : "opacity-0"
                                          }`}
                                        />
                                        All
                                      </CommandItem>
                                      {mockPeriods
                                        ?.filter((period) => {
                                          if (!periodSearchValue) {
                                            return mockPeriods.slice(0, 3).includes(period);
                                          }
                                          const searchLower = periodSearchValue.toLowerCase();
                                          return (
                                            period.code.toLowerCase().includes(searchLower) ||
                                            period.nameEs.toLowerCase().includes(searchLower)
                                          );
                                        })
                                        .map((period) => (
                                          <CommandItem
                                            key={period._id}
                                            value={`${period.code} ${period.nameEs}`}
                                            onSelect={() => {
                                              setSelectedPeriodId(period._id);
                                              setPeriodSearchValue("");
                                              setPeriodSearchOpen(false);
                                            }}
                                          >
                                            <Check
                                              className={`mr-2 h-4 w-4 ${
                                                selectedPeriodId === period._id
                                                  ? "opacity-100"
                                                  : "opacity-0"
                                              }`}
                                            />
                                            {period.code} - {period.nameEs}
                                          </CommandItem>
                                        ))}
                                    </CommandGroup>
                                  </CommandList>
                                </Command>
                              </PopoverContent>
                            </Popover>
                          </div>

                          {/* Status Filter */}
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">
                              Status
                            </label>
                            <Select
                              value={enrollmentStatusFilter}
                              onValueChange={(value) =>
                                setEnrollmentStatusFilter(
                                  value as EnrollmentStatusFilter,
                                )
                              }
                            >
                              <SelectTrigger className="w-full h-9 bg-background border-border/50 shadow-sm transition-colors hover:bg-accent/50">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-popover border-border/50 shadow-lg">
                                <SelectItem
                                  value="all"
                                  className="text-sm hover:bg-accent/50"
                                >
                                  All
                                </SelectItem>
                                <SelectItem
                                  value="enrolled"
                                  className="text-sm hover:bg-accent/50"
                                >
                                  Enrolled
                                </SelectItem>
                                <SelectItem
                                  value="in_progress"
                                  className="text-sm hover:bg-accent/50"
                                >
                                  In Progress
                                </SelectItem>
                                <SelectItem
                                  value="completed"
                                  className="text-sm hover:bg-accent/50"
                                >
                                  Completed
                                </SelectItem>
                                <SelectItem
                                  value="failed"
                                  className="text-sm hover:bg-accent/50"
                                >
                                  Failed
                                </SelectItem>
                                <SelectItem
                                  value="withdrawn"
                                  className="text-sm hover:bg-accent/50"
                                >
                                  Withdrawn
                                </SelectItem>
                                <SelectItem
                                  value="dropped"
                                  className="text-sm hover:bg-accent/50"
                                >
                                  Dropped
                                </SelectItem>
                                <SelectItem
                                  value="incomplete"
                                  className="text-sm hover:bg-accent/50"
                                >
                                  Incomplete
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </DropdownMenuContent>
                    </DropdownMenu>

                    {(activeFiltersCount > 0 || nameSearch !== "") && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setNameSearch("");
                          setSelectedStudentId("all");
                          setSelectedCourseId("all");
                          setSelectedSectionId("all");
                          setSelectedPeriodId("all");
                          setEnrollmentStatusFilter("all");
                        }}
                        className="h-10 px-3 text-sm text-muted-foreground hover:text-foreground"
                      >
                        Clear all
                      </Button>
                    )}
                    <Button
                      variant="default"
                      onClick={() => setIsCreateDialogOpen(true)}
                      className="h-10 px-4 font-medium shadow-sm"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Data Table Section - Integrated */}
        <div className="bg-card">
          <DataTable
            columns={columnsEnrollment}
            data={filteredEnrollments}
            onRowClick={handleRowClick}
            searchConfig={null}
            primaryAction={null}
            mobileColumns={{
              primaryColumn: "studentId",
              secondaryColumn: "status",
            }}
            emptyState={{
              title: "No enrollments found",
              description: (() => {
                const hasFilters =
                  nameSearch !== "" ||
                  selectedStudentId !== "all" ||
                  selectedCourseId !== "all" ||
                  selectedSectionId !== "all" ||
                  selectedPeriodId !== "all" ||
                  enrollmentStatusFilter !== "all";

                if (!hasFilters) {
                  return "No enrollments have been created yet. Create your first enrollment to get started.";
                }

                const activeFilters = [];
                if (nameSearch !== "") activeFilters.push(`"${nameSearch}"`);
                if (selectedStudentId !== "all") activeFilters.push(selectedStudentName);
                if (selectedCourseId !== "all") activeFilters.push(selectedCourseName);
                if (selectedSectionId !== "all") activeFilters.push(selectedSectionName);
                if (selectedPeriodId !== "all") activeFilters.push(selectedPeriodName);
                if (enrollmentStatusFilter !== "all") activeFilters.push(enrollmentStatusFilter);

                return `No enrollments match the selected filters: ${activeFilters.join(", ")}. Try adjusting your filters.`;
              })(),
            }}
            entityName="enrollments"
          />
        </div>
      </div>

      {/* Create Enrollment Dialog */}
      <EnrollmentFormDialog
        mode="create"
        open={isCreateDialogOpen}
        onOpenChange={handleCreateDialogClose}
      />

      {/* Edit Enrollment Dialog */}
      {selectedEnrollment && (
        <EnrollmentFormDialog
          mode="edit"
          enrollment={selectedEnrollment}
          open={isEditDialogOpen}
          onOpenChange={handleDialogClose}
        />
      )}
    </div>
  );
}
