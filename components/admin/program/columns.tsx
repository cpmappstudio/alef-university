"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { ArrowUpDown } from "lucide-react";
import { Program, Course, Section } from "./types";

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
      const code = row.getValue("code") as string;
      return <span className="hidden lg:inline">{code}</span>;
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

      return (
        <div className="space-y-1 w-full">
          <div className="whitespace-normal break-words md:overflow-hidden md:text-ellipsis lg:break-normal lg:overflow-visible lg:text-clip">
            {program.nameEs}
          </div>
          {/* Mobile/Tablet view: show additional info below name */}
          <div className="block lg:hidden text-sm text-muted-foreground space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs bg-muted px-2 py-0.5 rounded">
                {program.code}
              </span>
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
          className={`px-2 py-1 rounded-full text-xs ${
            isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
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
      const code = row.getValue("code") as string;
      return <span className="hidden lg:inline">{code}</span>;
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

      return (
        <div className="space-y-1 w-full">
          <div className="whitespace-normal break-words md:overflow-hidden md:text-ellipsis lg:break-normal lg:overflow-visible lg:text-clip">
            {course.nameEs}
          </div>
          {/* Mobile/Tablet view: show additional info below name */}
          <div className="block lg:hidden text-sm text-muted-foreground space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs bg-muted px-2 py-0.5 rounded">
                {course.code}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-1 text-xs">
              <span className="capitalize whitespace-nowrap">{categoryText}</span>
              <span>•</span>
              <span className="whitespace-nowrap">
                {course.credits} credits
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
          className={`px-2 py-1 rounded-full text-xs ${
            isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
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
      const professorName = (section as any).professorName || 'TBD';
      const enrollmentStats = (section as any).enrollmentStats;
      
      return (
        <div className="space-y-1 w-full">
          <div>
            {groupNumber}
          </div>
          {/* Mobile/Tablet view: show additional info below group */}
          <div className="block lg:hidden text-sm text-muted-foreground space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs">Prof: {professorName}</span>
            </div>
            {enrollmentStats && (
              <div className="flex flex-wrap items-center gap-1 text-xs">
                <span>{section.enrolled}/{section.capacity}</span>
                <span>•</span>
                <span>{(() => {
                  const deliveryMethodMap = {
                    online_sync: "Online Sync",
                    online_async: "Online Async", 
                    in_person: "In Person",
                    hybrid: "Hybrid",
                  };
                  return deliveryMethodMap[section.deliveryMethod as keyof typeof deliveryMethodMap] || section.deliveryMethod;
                })()}</span>
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
      const professorName = (section as any).professorName || 'TBD';
      return <span className="hidden lg:inline">{professorName}</span>;
    },
  },
  {
    accessorKey: "enrolled",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="hidden lg:flex"
        >
          Enrolled
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const section = row.original;
      
      return (
        <span className="hidden lg:inline">
          {row.getValue("enrolled")}/{section.capacity}
        </span>
      );
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
      const formattedMethod = deliveryMethodMap[deliveryMethod as keyof typeof deliveryMethodMap] || deliveryMethod;
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
          className={`px-2 py-1 rounded-full text-xs ${
            isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
          }`}
        >
          {isActive ? "Available" : "Unavailable"}
        </span>
      );
    },
  },
]