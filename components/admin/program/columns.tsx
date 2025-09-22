"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { ArrowUpDown } from "lucide-react";
import { Program } from "./types";

export const columns: ColumnDef<Program>[] = [
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
      )
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
      )
    },
    cell: ({ row }) => {
      const program = row.original;
      const type = program.type;
      const language = program.language;
      const languageMap = {
        es: "Spanish",
        en: "English",
        both: "English/Spanish"
      };
      const languageText = languageMap[language as keyof typeof languageMap] || language;

      return (
        <div className="space-y-1 w-full">
          <div className="font-medium whitespace-normal break-words md:overflow-hidden md:text-ellipsis lg:break-normal lg:overflow-visible lg:text-clip">{program.nameEs}</div>
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
              <span className="whitespace-nowrap">{program.totalCredits} credits</span>
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
      )
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
      )
    },
    cell: ({ row }) => {
      const language = row.getValue("language") as string;
      const languageMap = {
        es: "Spanish",
        en: "English",
        both: "Both"
      };
      return <span className="hidden lg:inline">{languageMap[language as keyof typeof languageMap] || language}</span>;
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
      )
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
          Status
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const isActive = row.getValue("isActive") as boolean;
      return (
        <span className={`px-2 py-1 rounded-full text-xs ${
          isActive 
            ? "bg-green-100 text-green-800" 
            : "bg-red-100 text-red-800"
        }`}>
          {isActive ? "Active" : "Inactive"}
        </span>
      );
    },
  },
];
