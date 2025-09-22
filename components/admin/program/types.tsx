import { Id } from "@/convex/_generated/dataModel";

/**
 * Program type definition based on the Convex database schema
 * Represents an academic program offered by the university
 */
export type Program = {
  // Document ID from Convex
  _id: Id<"programs">;
  
  // Program identification
  code: string;
  nameEs: string;
  nameEn?: string;
  descriptionEs: string;
  descriptionEn?: string;
  
  // Program classification
  type: "diploma" | "bachelor" | "master" | "doctorate";
  degree?: string; // "Bachelor of Arts", "Master of Science", etc.
  language: "es" | "en" | "both";
  
  // Academic requirements
  totalCredits: number;
  durationBimesters: number;
  
  // Financial information (optional)
  tuitionPerCredit?: number;
  
  // Status and audit fields
  isActive: boolean;
  createdAt: number;
  updatedAt?: number;
};

// /**
//  * Program type literals for validation and filtering
//  */
// export const PROGRAM_TYPES = ["diploma", "bachelor", "master", "doctorate"] as const;
// export type ProgramType = typeof PROGRAM_TYPES[number];

// export const PROGRAM_LANGUAGES = ["es", "en", "both"] as const;
// export type ProgramLanguage = typeof PROGRAM_LANGUAGES[number];

// /**
//  * Utility type for creating new programs (excludes system-generated fields)
//  */
// export type CreateProgramData = Omit<Program, "_id" | "createdAt" | "updatedAt">;

// /**
//  * Utility type for updating programs (all fields optional except ID)
//  */
// export type UpdateProgramData = Partial<Omit<Program, "_id">> & {
//   _id: Id<"programs">;
// };