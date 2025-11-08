"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowUpDown } from "lucide-react";
import { Program, Course, Section, Period, Enrollment, Student, Professor } from "./types";

export const columnsPrograms: ColumnDef<Program>[] = [
  {
    accessorKey: "code",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="hidden lg:flex"
        >
          Code
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const program = row.original;
      
      if (program.language === "both") {
        // Show both codes for bilingual programs
        return (
          <div className="hidden lg:flex flex-col gap-1 text-sm">
            {program.code && (
              <div className="flex items-center gap-1">
                <span className="text-xs text-muted-foreground">ES:</span>
                <span>{program.code}</span>
              </div>
            )}
            {program.codeEn && (
              <div className="flex items-center gap-1">
                <span className="text-xs text-muted-foreground">EN:</span>
                <span>{program.codeEn}</span>
              </div>
            )}
          </div>
        );
      }
      
      // Show the appropriate code based on language
      const displayCode = program.language === "en" 
        ? program.codeEn 
        : program.code || program.codeEn;
      return <span className="hidden lg:inline">{displayCode || "N/A"}</span>;
    },
  },
  {
    accessorKey: "nameEs",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const program = row.original;
      const type = program.type;
      const language = program.language;
      const languageMap = {
        es: "Spanish",
        en: "English",
        both: "English/Spanish",
      };
      const languageText =
        languageMap[language as keyof typeof languageMap] || language;

      // Show the appropriate name based on language
      const displayName = program.language === "en" 
        ? program.nameEn 
        : program.nameEs || program.nameEn;
      
      // Show the appropriate code based on language
      const displayCode = program.language === "en" 
        ? program.codeEn 
        : program.code || program.codeEn;

      return (
        <div className="space-y-1 w-full">
          {program.language === "both" ? (
            // Show both names for bilingual programs with labels in all screen sizes
            <div className="flex flex-col gap-1">
              {program.nameEs && (
                <div className="whitespace-normal break-words md:overflow-hidden md:text-ellipsis lg:break-normal lg:overflow-visible lg:text-clip">
                  <span className="text-xs text-muted-foreground mr-1">ES:</span>
                  {program.nameEs}
                </div>
              )}
              {program.nameEn && (
                <div className="whitespace-normal break-words md:overflow-hidden md:text-ellipsis lg:break-normal lg:overflow-visible lg:text-clip">
                  <span className="text-xs text-muted-foreground mr-1">EN:</span>
                  {program.nameEn}
                </div>
              )}
            </div>
          ) : (
            // Show single name for single-language programs
            <div className="whitespace-normal break-words md:overflow-hidden md:text-ellipsis lg:break-normal lg:overflow-visible lg:text-clip">
              {displayName || "N/A"}
            </div>
          )}
          {/* Mobile/Tablet view: show additional info below name */}
          <div className="block lg:hidden text-sm text-muted-foreground space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              {program.language === "both" ? (
                // Show both codes for bilingual in mobile view
                <>
                  {program.code && (
                    <span className="text-xs bg-muted px-2 py-0.5 rounded">
                      ES: {program.code}
                    </span>
                  )}
                  {program.codeEn && (
                    <span className="text-xs bg-muted px-2 py-0.5 rounded">
                      EN: {program.codeEn}
                    </span>
                  )}
                </>
              ) : (
                <span className="text-xs bg-muted px-2 py-0.5 rounded">
                  {displayCode || "N/A"}
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-1 text-xs">
              <span className="capitalize whitespace-nowrap">{type}</span>
              <span>•</span>
              <span className="whitespace-nowrap">
                {program.totalCredits} credits
              </span>
              <span>•</span>
              <span className="whitespace-nowrap">{languageText}</span>
            </div>
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "type",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="hidden lg:flex"
        >
          Type
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const type = row.getValue("type") as string;
      return <span className="capitalize hidden lg:inline">{type}</span>;
    },
  },
  {
    accessorKey: "language",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="hidden lg:flex"
        >
          Language
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const language = row.getValue("language") as string;
      const languageMap = {
        es: "Spanish",
        en: "English",
        both: "English/Spanish",
      };
      return (
        <span className="hidden lg:inline">
          {languageMap[language as keyof typeof languageMap] || language}
        </span>
      );
    },
  },
  {
    accessorKey: "totalCredits",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="hidden lg:flex"
        >
          Credits
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const credits = row.getValue("totalCredits") as number;
      return <span className="hidden lg:inline">{credits}</span>;
    },
  },
  {
    accessorKey: "isActive",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Availability
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const isActive = row.getValue("isActive") as boolean;
      return (
        <span
          className={`px-2 py-1 rounded-full text-xs ${isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
            }`}
        >
          {isActive ? "Available" : "Unavailable"}
        </span>
      );
    },
  },
];

export const columnsCourses: ColumnDef<Course>[] = [
  {
    accessorKey: "code",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="hidden lg:flex"
        >
          Code
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const course = row.original;
      
      if (course.language === "both") {
        // Show both codes for bilingual courses
        return (
          <div className="hidden lg:flex flex-col gap-1 text-sm">
            {course.code && (
              <div className="flex items-center gap-1">
                <span className="text-xs text-muted-foreground">ES:</span>
                <span>{course.code}</span>
              </div>
            )}
            {course.codeEn && (
              <div className="flex items-center gap-1">
                <span className="text-xs text-muted-foreground">EN:</span>
                <span>{course.codeEn}</span>
              </div>
            )}
          </div>
        );
      }
      
      // Show the appropriate code based on language
      const displayCode = course.language === "en" 
        ? course.codeEn 
        : course.code || course.codeEn;
      return <span className="hidden lg:inline">{displayCode || "N/A"}</span>;
    },
  },
  {
    accessorKey: "nameEs",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const course = row.original;
      const category = course.category;
      const language = course.language;
      const languageMap = {
        es: "Spanish",
        en: "English",
        both: "English/Spanish",
      };
      const categoryMap = {
        humanities: "Humanities",
        core: "Core",
        elective: "Elective",
        general: "General",
      };
      const languageText =
        languageMap[language as keyof typeof languageMap] || language;
      const categoryText =
        categoryMap[category as keyof typeof categoryMap] || category;

      // Show the appropriate name based on language
      const displayName = course.language === "en" 
        ? course.nameEn 
        : course.nameEs || course.nameEn;
      
      // Show the appropriate code based on language
      const displayCode = course.language === "en" 
        ? course.codeEn 
        : course.code || course.codeEn;

      return (
        <div className="space-y-1 w-full">
          {course.language === "both" ? (
            // Show both names for bilingual courses with labels in all screen sizes
            <div className="flex flex-col gap-1">
              {course.nameEs && (
                <div className="whitespace-normal break-words md:overflow-hidden md:text-ellipsis lg:break-normal lg:overflow-visible lg:text-clip">
                  <span className="text-xs text-muted-foreground mr-1">ES:</span>
                  {course.nameEs}
                </div>
              )}
              {course.nameEn && (
                <div className="whitespace-normal break-words md:overflow-hidden md:text-ellipsis lg:break-normal lg:overflow-visible lg:text-clip">
                  <span className="text-xs text-muted-foreground mr-1">EN:</span>
                  {course.nameEn}
                </div>
              )}
            </div>
          ) : (
            // Show single name for single-language courses
            <div className="whitespace-normal break-words md:overflow-hidden md:text-ellipsis lg:break-normal lg:overflow-visible lg:text-clip">
              {displayName || "N/A"}
            </div>
          )}
          {/* Mobile/Tablet view: show additional info below name */}
          <div className="block lg:hidden text-sm text-muted-foreground space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              {course.language === "both" ? (
                // Show both codes for bilingual in mobile view
                <>
                  {course.code && (
                    <span className="text-xs bg-muted px-2 py-0.5 rounded">
                      ES: {course.code}
                    </span>
                  )}
                  {course.codeEn && (
                    <span className="text-xs bg-muted px-2 py-0.5 rounded">
                      EN: {course.codeEn}
                    </span>
                  )}
                </>
              ) : (
                <span className="text-xs bg-muted px-2 py-0.5 rounded">
                  {displayCode || "N/A"}
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-1 text-xs">
              <span className="capitalize whitespace-nowrap">
                {categoryText}
              </span>
              <span>•</span>
              <span className="whitespace-nowrap">
                {course.credits} credits
              </span>
              <span>•</span>
              <span className="whitespace-nowrap">{languageText}</span>
            </div>
            {(course as any).programs && (course as any).programs.length > 0 && (
              <div className="flex flex-wrap items-center gap-1">
                <span className="text-xs text-muted-foreground">Programs:</span>
                {(course as any).programs.map((program: any, index: number) => (
                  <span 
                    key={index}
                    className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded"
                  >
                    {program.code}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "programs",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="hidden md:flex"
        >
          Programs
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const course = row.original;
      const programs = (course as any).programs || [];
      
      if (programs.length === 0) {
        return <span className="hidden md:inline text-muted-foreground">-</span>;
      }
      
      return (
        <div className="hidden md:flex flex-wrap gap-1">
          {programs.map((program: any, index: number) => (
            <span 
              key={index}
              className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded"
            >
              {program.code}
            </span>
          ))}
        </div>
      );
    },
  },
  {
    accessorKey: "category",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="hidden lg:flex"
        >
          Category
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const category = row.getValue("category") as string;
      const categoryMap = {
        humanities: "Humanities",
        core: "Core",
        elective: "Elective",
        general: "General",
      };
      return (
        <span className="capitalize hidden lg:inline">
          {categoryMap[category as keyof typeof categoryMap] || category}
        </span>
      );
    },
  },
  {
    accessorKey: "language",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="hidden lg:flex"
        >
          Language
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const language = row.getValue("language") as string;
      const languageMap = {
        es: "Spanish",
        en: "English",
        both: "English/Spanish",
      };
      return (
        <span className="hidden lg:inline">
          {languageMap[language as keyof typeof languageMap] || language}
        </span>
      );
    },
  },
  {
    accessorKey: "credits",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="hidden lg:flex"
        >
          Credits
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const credits = row.getValue("credits") as number;
      return <span className="hidden lg:inline">{credits}</span>;
    },
  },
  {
    accessorKey: "isActive",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Availability
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const isActive = row.getValue("isActive") as boolean;
      return (
        <span
          className={`px-2 py-1 rounded-full text-xs ${isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
            }`}
        >
          {isActive ? "Available" : "Unavailable"}
        </span>
      );
    },
  },
];

export const columnsSections: ColumnDef<Section>[] = [
  {
    accessorKey: "groupNumber",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Group
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const section = row.original;
      const groupNumber = row.getValue("groupNumber") as string;
      const professorName = (section as any).professorName || "TBD";
      const enrollmentStats = (section as any).enrollmentStats;

      return (
        <div className="space-y-1 w-full">
          <div>{groupNumber}</div>
          {/* Mobile/Tablet view: show additional info below group */}
          <div className="block lg:hidden text-sm text-muted-foreground space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs">Prof: {professorName}</span>
            </div>
            {enrollmentStats && (
              <div className="flex flex-wrap items-center gap-1 text-xs">
                <span>
                  {(() => {
                    const deliveryMethodMap = {
                      online_sync: "Online Sync",
                      online_async: "Online Async",
                      in_person: "In Person",
                      hybrid: "Hybrid",
                    };
                    return (
                      deliveryMethodMap[
                      section.deliveryMethod as keyof typeof deliveryMethodMap
                      ] || section.deliveryMethod
                    );
                  })()}
                </span>
                <span>•</span>
                <span className="capitalize">{section.status}</span>
              </div>
            )}
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "professorId",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="hidden lg:flex"
        >
          Professor
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const section = row.original;
      const professorName = (section as any).professorName || "TBD";
      return <span className="hidden lg:inline">{professorName}</span>;
    },
  },
  {
    accessorKey: "deliveryMethod",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="hidden lg:flex"
        >
          Delivery Method
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const deliveryMethod = row.getValue("deliveryMethod") as string;
      const deliveryMethodMap = {
        online_sync: "Online Sync",
        online_async: "Online Async",
        in_person: "In Person",
        hybrid: "Hybrid",
      };
      const formattedMethod =
        deliveryMethodMap[deliveryMethod as keyof typeof deliveryMethodMap] ||
        deliveryMethod;
      return <span className="hidden lg:inline">{formattedMethod}</span>;
    },
  },
  {
    accessorKey: "status",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="hidden lg:flex"
        >
          Status
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const status = row.getValue("status") as string;
      return <span className="capitalize hidden lg:inline">{status}</span>;
    },
  },
  {
    accessorKey: "isActive",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Availability
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const isActive = row.getValue("isActive") as boolean;
      return (
        <span
          className={`px-2 py-1 rounded-full text-xs ${isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
            }`}
        >
          {isActive ? "Available" : "Unavailable"}
        </span>
      );
    },
  },
];
export const columnsPeriod: ColumnDef<Period>[] = [
  {
    accessorKey: "code",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="hidden lg:flex"
        >
          Code
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    }
  },
  {
    accessorKey: "nameEs",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    }
  },
  {
    accessorKey: "year",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Year
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    }
  },
  {
    accessorKey: "bimester",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Bimester
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    }
  },
  {
    accessorKey: "start date",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Start Date
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    }
  },
  {
    accessorKey: "end date",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          End Date
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    }
  },
  {
    accessorKey: "status",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Status
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    }
  },
];

export const columnsEnrollment: ColumnDef<Enrollment>[] = [
  {
    accessorKey: "studentId",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Student
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const enrollment = row.original;
      const studentName = (enrollment as any).studentName || "Unknown Student";
      const courseName = (enrollment as any).courseName || "Unknown Course";
      const sectionInfo = (enrollment as any).sectionInfo || {};
      const periodInfo = (enrollment as any).periodInfo || {};
      const professorName = (enrollment as any).professorName || "TBD";

      return (
        <div className="space-y-1 w-full">
          <div className="whitespace-normal break-words md:overflow-hidden md:text-ellipsis lg:break-normal lg:overflow-visible lg:text-clip">
            {studentName}
          </div>
          {/* Mobile/Tablet view: show additional info below student name */}
          <div className="block lg:hidden text-sm text-muted-foreground space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs bg-muted px-2 py-0.5 rounded">
                {courseName}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-1 text-xs">
              <span className="whitespace-nowrap">
                Section: {sectionInfo.groupNumber || "N/A"}
              </span>
              <span>•</span>
              <span className="whitespace-nowrap">
                {periodInfo.nameEs || "Unknown Period"}
              </span>
              <span>•</span>
              <span className="whitespace-nowrap">Prof: {professorName}</span>
            </div>
            {(enrollment.letterGrade || enrollment.isRetake) && (
              <div className="flex flex-wrap items-center gap-1 text-xs">
                {enrollment.letterGrade && (
                  <>
                    <span className="bg-blue-100 text-blue-800 px-1 py-0.5 rounded">
                      {enrollment.letterGrade}
                    </span>
                    <span>•</span>
                  </>
                )}
                {enrollment.isRetake && (
                  <span className="bg-orange-100 text-orange-800 px-1 py-0.5 rounded">
                    Retake
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "sectionId",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="hidden lg:flex"
        >
          Section
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const enrollment = row.original;
      const sectionInfo = (enrollment as any).sectionInfo || {};
      return (
        <span className="hidden lg:inline">
          {sectionInfo.groupNumber || "N/A"}
        </span>
      );
    },
  },
  {
    accessorKey: "periodId",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="hidden lg:flex"
        >
          Period
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const enrollment = row.original;
      const periodInfo = (enrollment as any).periodInfo || {};
      return (
        <span className="hidden lg:inline">
          {periodInfo.nameEs || "Unknown Period"}
        </span>
      );
    },
  },
  {
    accessorKey: "courseId",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="hidden lg:flex"
        >
          Course
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const enrollment = row.original;
      const courseName = (enrollment as any).courseName || "Unknown Course";
      return <span className="hidden lg:inline">{courseName}</span>;
    },
  },
  {
    accessorKey: "professorId",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="hidden lg:flex"
        >
          Professor
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const enrollment = row.original;
      const professorName = (enrollment as any).professorName || "TBD";
      return <span className="hidden lg:inline">{professorName}</span>;
    },
  },
  {
    accessorKey: "status",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Status
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const status = row.getValue("status") as string;
      const statusMap = {
        enrolled: "Enrolled",
        withdrawn: "Withdrawn",
        dropped: "Dropped",
        completed: "Completed",
        failed: "Failed",
        incomplete: "Incomplete",
        in_progress: "In Progress",
      };
      const statusText = statusMap[status as keyof typeof statusMap] || status;

      const getStatusColor = (status: string) => {
        switch (status) {
          case "enrolled":
          case "in_progress":
            return "bg-blue-100 text-blue-800";
          case "completed":
            return "bg-green-100 text-green-800";
          case "failed":
          case "dropped":
            return "bg-red-100 text-red-800";
          case "withdrawn":
            return "bg-gray-100 text-gray-800";
          case "incomplete":
            return "bg-yellow-100 text-yellow-800";
          default:
            return "bg-gray-100 text-gray-800";
        }
      };

      return (
        <span
          className={`px-2 py-1 rounded-full text-xs ${getStatusColor(status)}`}
        >
          {statusText}
        </span>
      );
    },
  },
  {
    accessorKey: "letterGrade",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="hidden lg:flex"
        >
          Grade
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const letterGrade = row.getValue("letterGrade") as string | undefined;
      return (
        <span className="hidden lg:inline">
          {letterGrade ? (
            <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium">
              {letterGrade}
            </span>
          ) : (
            <span className="text-muted-foreground">-</span>
          )}
        </span>
      );
    },
  },
  {
    accessorKey: "isRetake",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="hidden lg:flex"
        >
          Retake
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const isRetake = row.getValue("isRetake") as boolean;
      return (
        <span className="hidden lg:inline">
          {isRetake ? (
            <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded text-xs">
              Yes
            </span>
          ) : (
            <span className="text-muted-foreground">No</span>
          )}
        </span>
      );
    },
  },
];

export const columnsStudent: ColumnDef<Student>[] = [
  {
    accessorKey: "firstName",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const student = row.original;
      const fullName = `${student.firstName} ${student.lastName}`;
      const studentCode = student.studentProfile?.studentCode || "N/A";
      const programName = (student as any).programName || "N/A";

      return (
        <div className="space-y-1 w-full">
          <div className="whitespace-normal break-words md:overflow-hidden md:text-ellipsis lg:break-normal lg:overflow-visible lg:text-clip">
            {fullName}
          </div>
          {/* Mobile/Tablet view: show additional info below name */}
          <div className="block lg:hidden text-sm text-muted-foreground space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs bg-muted px-2 py-0.5 rounded">
                {studentCode}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-1 text-xs">
              <span className="whitespace-nowrap">{programName}</span>
            </div>
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "studentProfile.studentCode",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="hidden lg:flex"
        >
          Student Code
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const student = row.original;
      const studentCode = student.studentProfile?.studentCode || "N/A";
      return <span className="hidden lg:inline">{studentCode}</span>;
    },
  },
  {
    accessorKey: "studentProfile.programId",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="hidden lg:flex"
        >
          Program
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const student = row.original;
      const programName = (student as any).programName || "N/A";
      return <span className="hidden lg:inline">{programName}</span>;
    },
  },
  {
    accessorKey: "studentProfile.status",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Status
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const student = row.original;
      const status = student?.studentProfile?.status;

      if (!status) {
        return <Badge variant="secondary">Unknown</Badge>;
      }

      const getStatusColor = (status: string) => {
        switch (status) {
          case "active":
            return "bg-green-100 text-green-800";
          case "inactive":
            return "bg-gray-100 text-gray-800";
          case "on_leave":
            return "bg-yellow-100 text-yellow-800";
          case "graduated":
            return "bg-blue-100 text-blue-800";
          case "withdrawn":
            return "bg-red-100 text-red-800";
          default:
            return "bg-gray-100 text-gray-800";
        }
      };

      const statusText = status.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase());

      return (
        <span
          className={`px-2 py-1 rounded-full text-xs capitalize ${getStatusColor(status)}`}
        >
          {statusText}
        </span>
      );
    },
  },
];

export const columnsProfessor: ColumnDef<Professor>[] = [
  {
    accessorKey: "firstName",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const professor = row.original;
      const fullName = `${professor.firstName} ${professor.lastName}`;
      const employeeCode = professor.professorProfile?.employeeCode || "N/A";
      const title = professor.professorProfile?.title;
      const department = professor.professorProfile?.department;

      return (
        <div className="space-y-1 w-full">
          <div className="whitespace-normal break-words md:overflow-hidden md:text-ellipsis lg:break-normal lg:overflow-visible lg:text-clip">
            {fullName}
          </div>
          {/* Mobile/Tablet view: show additional info below name */}
          <div className="block lg:hidden text-sm text-muted-foreground space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs bg-muted px-2 py-0.5 rounded">
                {employeeCode}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-1 text-xs">
              {title && (
                <>
                  <span className="whitespace-nowrap">{title}</span>
                  <span>•</span>
                </>
              )}
              {department && (
                <span className="whitespace-nowrap">{department}</span>
              )}
            </div>
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "professorProfile.employeeCode",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="hidden lg:flex"
        >
          Employee Code
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const professor = row.original;
      const employeeCode = professor.professorProfile?.employeeCode || "N/A";
      return <span className="hidden lg:inline">{employeeCode}</span>;
    },
  },
  {
    accessorKey: "professorProfile.title",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="hidden lg:flex"
        >
          Title
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const professor = row.original;
      const title = professor.professorProfile?.title;
      return <span className="hidden lg:inline">{title || "N/A"}</span>;
    },
  },
  {
    accessorKey: "professorProfile.department",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="hidden lg:flex"
        >
          Department
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const professor = row.original;
      const department = professor.professorProfile?.department;
      return <span className="hidden lg:inline">{department || "N/A"}</span>;
    },
  },
  {
    accessorKey: "isActive",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Status
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const isActive = row.getValue("isActive") as boolean;
      return (
        <span
          className={`px-2 py-1 rounded-full text-xs ${isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
            }`}
        >
          {isActive ? "Active" : "Inactive"}
        </span>
      );
    },
  },
];
