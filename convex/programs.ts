/* THIS NEEDS REFACTORING */

import { query, mutation, internalMutation } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import type { DatabaseReader, DatabaseWriter } from "./_generated/server";
import {
  getUserByClerkId,
  getProgramCourses,
  calculateAcademicProgress,
} from "./helpers";
import {
  programTypeValidator,
  languageValidator,
  courseCategoryValidator,
} from "./types";

/**
 * Get all programs with filtering
 */
export const getAllPrograms = query({
  args: {
    type: v.optional(programTypeValidator),
    language: v.optional(languageValidator),
    isActive: v.optional(v.boolean()),
    searchTerm: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    let programs: Doc<"programs">[];

    // Use appropriate index based on filters
    if (args.type !== undefined && args.isActive !== undefined) {
      programs = await ctx.db
        .query("programs")
        .withIndex("by_type_active", (q) =>
          q.eq("type", args.type!).eq("isActive", args.isActive!),
        )
        .collect();
    } else if (args.language !== undefined && args.isActive !== undefined) {
      programs = await ctx.db
        .query("programs")
        .withIndex("by_language_active", (q) =>
          q.eq("language", args.language!).eq("isActive", args.isActive!),
        )
        .collect();
    } else if (args.isActive !== undefined) {
      programs = await ctx.db
        .query("programs")
        .withIndex("by_active", (q) => q.eq("isActive", args.isActive!))
        .collect();
    } else {
      programs = await ctx.db.query("programs").collect();
    }

    // Apply additional filters
    if (args.type !== undefined && args.isActive === undefined) {
      programs = programs.filter((program) => program.type === args.type);
    }
    if (args.language !== undefined && args.isActive === undefined) {
      programs = programs.filter(
        (program) => program.language === args.language,
      );
    }

    // Apply search term filter
    if (args.searchTerm) {
      const searchLower = args.searchTerm.toLowerCase();
      programs = programs.filter(
        (program) =>
          program.codeEs?.toLowerCase().includes(searchLower) ||
          program.codeEn?.toLowerCase().includes(searchLower) ||
          program.nameEs?.toLowerCase().includes(searchLower) ||
          program.nameEn?.toLowerCase().includes(searchLower),
      );
    }

    return programs;
  },
});

/**
 * Get a single program by ID
 */
export const getProgramById = query({
  args: {
    id: v.id("programs"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const program = await ctx.db.get(args.id);
    return program;
  },
});

export const getProgramCategories = query({
  args: {},

  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      return [];
    }

    const categories = await ctx.db.query("program_categories").collect();

    // Get program count for each category
    const categoriesWithCount = await Promise.all(
      categories.map(async (category) => {
        const programCount = await ctx.db
          .query("programs")
          .filter((q) => q.eq(q.field("categoryId"), category._id))
          .collect()
          .then((programs) => programs.length);

        return {
          ...category,
          programCount,
        };
      }),
    );

    categoriesWithCount.sort((a, b) => a.name.localeCompare(b.name));

    return categoriesWithCount;
  },
});

/**
 * Create a new program category
 */
export const createProgramCategory = mutation({
  args: {
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new ConvexError("Not authenticated");
    }

    const user = await getUserByClerkId(ctx.db, identity.subject);

    if (!user || (user.role !== "admin" && user.role !== "superadmin")) {
      throw new ConvexError("Unauthorized: Admin access required");
    }

    const trimmedName = args.name.trim();
    if (!trimmedName) {
      throw new ConvexError("Category name is required");
    }

    const existingCategory = await ctx.db
      .query("program_categories")
      .withIndex("by_name", (q) => q.eq("name", trimmedName))
      .first();

    if (existingCategory) {
      throw new ConvexError("A category with this name already exists");
    }

    const categoryId = await ctx.db.insert("program_categories", {
      name: trimmedName,
    });

    return categoryId;
  },
});

/**
 * Delete a program category
 */
export const deleteProgramCategory = mutation({
  args: {
    categoryId: v.id("program_categories"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new ConvexError("Not authenticated");
    }

    const user = await getUserByClerkId(ctx.db, identity.subject);

    if (!user || (user.role !== "admin" && user.role !== "superadmin")) {
      throw new ConvexError("Unauthorized: Admin access required");
    }

    // Check if there are any programs using this category
    const programsWithCategory = await ctx.db
      .query("programs")
      .filter((q) => q.eq(q.field("categoryId"), args.categoryId))
      .collect();

    if (programsWithCategory.length > 0) {
      throw new ConvexError(
        `Cannot delete category: ${programsWithCategory.length} program(s) are using this category`,
      );
    }

    await ctx.db.delete(args.categoryId);

    return { success: true };
  },
});

export const internalCreateProgramCategory = internalMutation({
  args: {
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const trimmedName = args.name.trim();
    if (!trimmedName) {
      throw new ConvexError("Category name is required");
    }

    const existingCategory = await ctx.db
      .query("program_categories")
      .withIndex("by_name", (q) => q.eq("name", trimmedName))
      .first();

    if (existingCategory) {
      return existingCategory._id;
    }

    const categoryId = await ctx.db.insert("program_categories", {
      name: trimmedName,
    });

    return categoryId;
  },
});

/**
 * Create new program (Admin only)
 * Validates language-specific fields based on the 'language' selection
 * codeEs and codeEn are validated based on language:
 * - language="es" → codeEs is required
 * - language="en" → codeEn is required
 * - language="both" → both codeEs and codeEn are required
 */
export const createProgram = mutation({
  args: {
    codeEs: v.optional(v.string()),
    codeEn: v.optional(v.string()),
    nameEs: v.optional(v.string()),
    nameEn: v.optional(v.string()),
    descriptionEs: v.optional(v.string()),
    descriptionEn: v.optional(v.string()),
    type: programTypeValidator,
    degree: v.optional(v.string()),
    categoryId: v.id("program_categories"),
    language: languageValidator,
    durationBimesters: v.number(),
    tuitionPerCredit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Not authenticated");
    }

    const user = await getUserByClerkId(ctx.db, identity.subject);
    if (!user || (user.role !== "admin" && user.role !== "superadmin")) {
      throw new ConvexError("Admin access required");
    }

    const category = await ctx.db.get(args.categoryId);
    if (!category) {
      throw new ConvexError("Invalid program category");
    }

    // Validate duration
    if (args.durationBimesters <= 0) {
      throw new ConvexError("Duration must be greater than 0");
    }

    // Validate language-specific fields based on language selection
    if (args.language === "es" || args.language === "both") {
      if (!args.codeEs || args.codeEs.trim() === "") {
        throw new ConvexError(
          "Spanish program codeEs is required when language is Spanish or both",
        );
      }
      if (!args.nameEs || args.nameEs.trim() === "") {
        throw new ConvexError(
          "Spanish name is required when language is Spanish or both",
        );
      }
      if (!args.descriptionEs || args.descriptionEs.trim() === "") {
        throw new ConvexError(
          "Spanish description is required when language is Spanish or both",
        );
      }
    }

    if (args.language === "en" || args.language === "both") {
      if (!args.codeEn || args.codeEn.trim() === "") {
        throw new ConvexError(
          "English program codeEs is required when language is English or both",
        );
      }
      if (!args.nameEn || args.nameEn.trim() === "") {
        throw new ConvexError(
          "English name is required when language is English or both",
        );
      }
      if (!args.descriptionEn || args.descriptionEn.trim() === "") {
        throw new ConvexError(
          "English description is required when language is English or both",
        );
      }
    }

    // Check for duplicate codes
    const allPrograms = await ctx.db.query("programs").collect();

    if (args.codeEs) {
      const duplicateCode = allPrograms.find((p) => p.codeEs === args.codeEs);
      if (duplicateCode) {
        throw new ConvexError(`Program codeEs "${args.codeEs}" already exists`);
      }
    }

    if (args.codeEn) {
      const duplicateCodeEn = allPrograms.find((p) => p.codeEn === args.codeEn);
      if (duplicateCodeEn) {
        throw new ConvexError(`Program codeEs "${args.codeEn}" already exists`);
      }
    }

    // Create program with totalCredits initialized to 0
    // Credits will be automatically calculated from associated courses
    const programId = await ctx.db.insert("programs", {
      codeEs: args.codeEs,
      codeEn: args.codeEn,
      nameEs: args.nameEs,
      nameEn: args.nameEn,
      descriptionEs: args.descriptionEs,
      descriptionEn: args.descriptionEn,
      type: args.type,
      degree: args.degree,
      categoryId: args.categoryId,
      language: args.language,
      totalCredits: 0,
      durationBimesters: args.durationBimesters,
      tuitionPerCredit: args.tuitionPerCredit,
      isActive: true,
      createdAt: Date.now(),
    });

    return programId;
  },
});

export const internalCreateProgram = internalMutation({
  args: {
    codeEs: v.optional(v.string()),
    codeEn: v.optional(v.string()),
    nameEs: v.optional(v.string()),
    nameEn: v.optional(v.string()),
    descriptionEs: v.optional(v.string()),
    descriptionEn: v.optional(v.string()),
    type: programTypeValidator,
    degree: v.optional(v.string()),
    categoryId: v.id("program_categories"),
    language: languageValidator,
    durationBimesters: v.number(),
    tuitionPerCredit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const category = await ctx.db.get(args.categoryId);
    if (!category) {
      throw new ConvexError("Invalid program category");
    }

    // Validate duration
    if (args.durationBimesters <= 0) {
      throw new ConvexError("Duration must be greater than 0");
    }

    // Validate language-specific fields based on language selection
    if (args.language === "es" || args.language === "both") {
      if (!args.codeEs || args.codeEs.trim() === "") {
        throw new ConvexError(
          "Spanish program codeEs is required when language is Spanish or both",
        );
      }
      if (!args.nameEs || args.nameEs.trim() === "") {
        throw new ConvexError(
          "Spanish name is required when language is Spanish or both",
        );
      }
      if (!args.descriptionEs || args.descriptionEs.trim() === "") {
        throw new ConvexError(
          "Spanish description is required when language is Spanish or both",
        );
      }
    }

    if (args.language === "en" || args.language === "both") {
      if (!args.codeEn || args.codeEn.trim() === "") {
        throw new ConvexError(
          "English program codeEs is required when language is English or both",
        );
      }
      if (!args.nameEn || args.nameEn.trim() === "") {
        throw new ConvexError(
          "English name is required when language is English or both",
        );
      }
      if (!args.descriptionEn || args.descriptionEn.trim() === "") {
        throw new ConvexError(
          "English description is required when language is English or both",
        );
      }
    }

    // Check for duplicate codes
    const allPrograms = await ctx.db.query("programs").collect();

    if (args.codeEs) {
      const duplicateCode = allPrograms.find((p) => p.codeEs === args.codeEs);
      if (duplicateCode) {
        throw new ConvexError(`Program codeEs "${args.codeEs}" already exists`);
      }
    }

    if (args.codeEn) {
      const duplicateCodeEn = allPrograms.find((p) => p.codeEn === args.codeEn);
      if (duplicateCodeEn) {
        throw new ConvexError(`Program codeEs "${args.codeEn}" already exists`);
      }
    }

    // Create program with totalCredits initialized to 0
    // Credits will be automatically calculated from associated courses
    const programId = await ctx.db.insert("programs", {
      codeEs: args.codeEs,
      codeEn: args.codeEn,
      nameEs: args.nameEs,
      nameEn: args.nameEn,
      descriptionEs: args.descriptionEs,
      descriptionEn: args.descriptionEn,
      type: args.type,
      degree: args.degree,
      categoryId: args.categoryId,
      language: args.language,
      totalCredits: 0,
      durationBimesters: args.durationBimesters,
      tuitionPerCredit: args.tuitionPerCredit,
      isActive: true,
      createdAt: Date.now(),
    });

    return programId;
  },
});

/**
 * Update existing program (Admin only)
 * This version allows updating descriptive fields while keeping core academic rules immutable.
 * Validates language-specific fields based on the 'language' selection.
 * Note: codeEs and codeEn can be updated to maintain consistency with language setting.
 */
export const updateProgram = mutation({
  args: {
    programId: v.id("programs"),
    // Editable fields
    codeEs: v.optional(v.string()),
    codeEn: v.optional(v.string()),
    nameEs: v.optional(v.string()),
    nameEn: v.optional(v.string()),
    descriptionEs: v.optional(v.string()),
    descriptionEn: v.optional(v.string()),
    degree: v.optional(v.string()),
    categoryId: v.id("program_categories"),
    language: languageValidator,
    type: programTypeValidator,
    durationBimesters: v.number(),
    tuitionPerCredit: v.optional(v.number()),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Not authenticated");
    }

    const user = await getUserByClerkId(ctx.db, identity.subject);
    if (!user || (user.role !== "admin" && user.role !== "superadmin")) {
      throw new ConvexError("Admin access required");
    }

    const { programId, ...updates } = args;

    const program = await ctx.db.get(programId);
    if (!program) {
      throw new ConvexError("Program not found");
    }

    const category = await ctx.db.get(updates.categoryId);
    if (!category) {
      throw new ConvexError("Invalid program category");
    }

    // Validate language-specific fields based on language selection
    if (updates.language === "es" || updates.language === "both") {
      if (!updates.codeEs || updates.codeEs.trim() === "") {
        throw new ConvexError(
          "Spanish program codeEs is required when language is Spanish or both",
        );
      }
      if (!updates.nameEs || updates.nameEs.trim() === "") {
        throw new ConvexError(
          "Spanish name is required when language is Spanish or both",
        );
      }
      if (!updates.descriptionEs || updates.descriptionEs.trim() === "") {
        throw new ConvexError(
          "Spanish description is required when language is Spanish or both",
        );
      }
    }

    if (updates.language === "en" || updates.language === "both") {
      if (!updates.codeEn || updates.codeEn.trim() === "") {
        throw new ConvexError(
          "English program codeEs is required when language is English or both",
        );
      }
      if (!updates.nameEn || updates.nameEn.trim() === "") {
        throw new ConvexError(
          "English name is required when language is English or both",
        );
      }
      if (!updates.descriptionEn || updates.descriptionEn.trim() === "") {
        throw new ConvexError(
          "English description is required when language is English or both",
        );
      }
    }

    if (updates.durationBimesters <= 0) {
      throw new ConvexError("Program duration must be a positive number");
    }

    // Check for duplicate codes (excluding current program)
    const allPrograms = await ctx.db.query("programs").collect();

    if (updates.codeEs) {
      const duplicateCode = allPrograms.find(
        (p) => p._id !== programId && p.codeEs === updates.codeEs,
      );
      if (duplicateCode) {
        throw new ConvexError(
          `Program codeEs "${updates.codeEs}" already exists`,
        );
      }
    }

    if (updates.codeEn) {
      const duplicateCodeEn = allPrograms.find(
        (p) => p._id !== programId && p.codeEn === updates.codeEn,
      );
      if (duplicateCodeEn) {
        throw new ConvexError(
          `Program codeEs "${updates.codeEn}" already exists`,
        );
      }
    }

    // Construct the update payload securely
    const updatePayload = {
      codeEs: updates.codeEs,
      codeEn: updates.codeEn,
      nameEs: updates.nameEs,
      nameEn: updates.nameEn,
      descriptionEs: updates.descriptionEs,
      descriptionEn: updates.descriptionEn,
      degree: updates.degree,
      categoryId: updates.categoryId,
      language: updates.language,
      type: updates.type,
      durationBimesters: updates.durationBimesters,
      tuitionPerCredit: updates.tuitionPerCredit,
      isActive: updates.isActive,
    };

    await ctx.db.patch(programId, updatePayload);

    return programId;
  },
});

/**
 * Get program with courses and requirements
 */
export const getProgramDetails = query({
  args: {
    programId: v.id("programs"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Not authenticated");
    }

    const program = await ctx.db.get(args.programId);
    if (!program) {
      throw new ConvexError("Program not found");
    }

    // Get program courses
    const programCourses = await getProgramCourses(ctx.db, args.programId);

    // Get program requirements
    const requirements = await ctx.db
      .query("program_requirements")
      .withIndex("by_program_active", (q) =>
        q.eq("programId", args.programId).eq("isActive", true),
      )
      .first();

    // Get student count for this program
    const students = await ctx.db
      .query("users")
      .withIndex("by_role_active", (q) =>
        q.eq("role", "student").eq("isActive", true),
      )
      .collect();

    const enrolledStudents = students.filter(
      (student) => student.studentProfile?.programId === args.programId,
    );

    // Organize courses by category
    const coursesByCategory = {
      humanities: programCourses.filter((pc) => pc.category === "humanities"),
      core: programCourses.filter((pc) => pc.category === "core"),
      elective: programCourses.filter((pc) => pc.category === "elective"),
      general: programCourses.filter((pc) => pc.category === "general"),
    };

    return {
      program,
      requirements,
      courses: coursesByCategory,
      statistics: {
        totalCourses: programCourses.length,
        requiredCourses: programCourses.filter((pc) => pc.isRequired).length,
        electives: programCourses.filter((pc) => !pc.isRequired).length,
        enrolledStudents: enrolledStudents.length,
        totalCredits: programCourses.reduce(
          (sum, pc) => sum + pc.course.credits,
          0,
        ),
      },
    };
  },
});

/**
 * Create or update program requirements (Admin only)
 */
export const setProgramRequirements = mutation({
  args: {
    programId: v.id("programs"),
    requirements: v.object({
      humanities: v.object({
        required: v.number(),
        description: v.optional(v.string()),
      }),
      core: v.object({
        required: v.number(),
        description: v.optional(v.string()),
      }),
      elective: v.object({
        required: v.number(),
        minPerCategory: v.optional(v.number()),
        description: v.optional(v.string()),
      }),
      general: v.object({
        required: v.number(),
        description: v.optional(v.string()),
      }),
      total: v.number(),
    }),
    minGPA: v.number(),
    minCGPA: v.optional(v.number()),
    maxBimesters: v.number(),
    maxYears: v.optional(v.number()),
    probationGPA: v.optional(v.number()),
    suspensionGPA: v.optional(v.number()),
    effectiveDate: v.optional(v.number()), // Defaults to now
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Not authenticated");
    }

    const user = await getUserByClerkId(ctx.db, identity.subject);
    if (!user || (user.role !== "admin" && user.role !== "superadmin")) {
      throw new ConvexError("Admin access required");
    }

    const program = await ctx.db.get(args.programId);
    if (!program) {
      throw new ConvexError("Program not found");
    }

    // Validate requirements
    const totalRequired =
      args.requirements.humanities.required +
      args.requirements.core.required +
      args.requirements.elective.required +
      args.requirements.general.required;

    if (totalRequired !== args.requirements.total) {
      throw new ConvexError(
        "Sum of category requirements must equal total requirements",
      );
    }

    if (args.requirements.total !== program.totalCredits) {
      throw new ConvexError(
        "Total requirements must match program total credits",
      );
    }

    // Validate GPA thresholds
    if (args.minGPA < 0 || args.minGPA > 4.0) {
      throw new ConvexError("Minimum GPA must be between 0 and 4.0");
    }

    // Deactivate existing requirements
    const existingRequirements = await ctx.db
      .query("program_requirements")
      .withIndex("by_program_active", (q) =>
        q.eq("programId", args.programId).eq("isActive", true),
      )
      .collect();

    for (const req of existingRequirements) {
      await ctx.db.patch(req._id, {
        isActive: false,
        endDate: Date.now(),
        updatedAt: Date.now(),
      });
    }

    // Create new requirements
    const requirementsId = await ctx.db.insert("program_requirements", {
      programId: args.programId,
      requirements: args.requirements,
      minGPA: args.minGPA,
      minCGPA: args.minCGPA,
      maxBimesters: args.maxBimesters,
      maxYears: args.maxYears,
      probationGPA: args.probationGPA,
      suspensionGPA: args.suspensionGPA,
      effectiveDate: args.effectiveDate || Date.now(),
      isActive: true,
      createdAt: Date.now(),
    });

    return requirementsId;
  },
});

/**
 * Get students enrolled in a program
 */
export const getProgramStudents = query({
  args: {
    programId: v.id("programs"),
    includeProgress: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Not authenticated");
    }

    const user = await getUserByClerkId(ctx.db, identity.subject);
    if (!user || (user.role !== "admin" && user.role !== "superadmin")) {
      throw new ConvexError("Admin access required");
    }

    const program = await ctx.db.get(args.programId);
    if (!program) {
      throw new ConvexError("Program not found");
    }

    // Get all students
    const allStudents = await ctx.db
      .query("users")
      .withIndex("by_role_active", (q) =>
        q.eq("role", "student").eq("isActive", true),
      )
      .collect();

    // Filter students by program
    const programStudents = allStudents.filter(
      (student) => student.studentProfile?.programId === args.programId,
    );

    // Get student details with progress if requested
    const studentDetails = await Promise.all(
      programStudents.map(async (student) => {
        let academicProgress = null;

        if (args.includeProgress) {
          academicProgress = await calculateAcademicProgress(
            ctx.db,
            student._id,
          );
        }

        return {
          student,
          academicProgress,
        };
      }),
    );

    // Calculate summary statistics
    const summary: any = {
      totalStudents: studentDetails.length,
    };

    if (args.includeProgress) {
      const progressData = studentDetails
        .filter((s) => s.academicProgress)
        .map((s) => s.academicProgress!);

      if (progressData.length > 0) {
        summary.averageGPA =
          progressData.reduce((sum, p) => sum + p.gpa, 0) / progressData.length;
        summary.averageCompletion =
          progressData.reduce((sum, p) => sum + p.completionPercentage, 0) /
          progressData.length;
      }
    }

    return {
      program,
      students: studentDetails,
      summary,
    };
  },
});

/**
 * Assign student to program (Admin only)
 */
export const assignStudentToProgram = mutation({
  args: {
    studentId: v.id("users"),
    programId: v.id("programs"),
    studentCode: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Not authenticated");
    }

    const user = await getUserByClerkId(ctx.db, identity.subject);
    if (!user || (user.role !== "admin" && user.role !== "superadmin")) {
      throw new ConvexError("Admin access required");
    }

    const student = await ctx.db.get(args.studentId);
    if (!student || student.role !== "student") {
      throw new ConvexError("Student not found or invalid role");
    }

    const program = await ctx.db.get(args.programId);
    if (!program) {
      throw new ConvexError("Program not found");
    }

    // Check for duplicate student code
    const existingStudent = await ctx.db
      .query("users")
      .filter(
        (q) =>
          q.eq(q.field("role"), "student") &&
          q.neq(q.field("_id"), args.studentId),
      )
      .collect();

    const duplicateCode = existingStudent.find(
      (s) => s.studentProfile?.studentCode === args.studentCode,
    );

    if (duplicateCode) {
      throw new ConvexError("Student code already exists");
    }

    // Update student with program assignment
    await ctx.db.patch(args.studentId, {
      studentProfile: {
        studentCode: args.studentCode,
        programId: args.programId,
      },
      isActive: true, // Activate student when assigning to program
    });

    return {
      studentId: args.studentId,
      programId: args.programId,
      message: "Student successfully assigned to program",
    };
  },
});

/**
 * Get program statistics and analytics (Admin only)
 */
export const getProgramStatistics = query({
  args: {
    programId: v.optional(v.id("programs")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Not authenticated");
    }

    const user = await getUserByClerkId(ctx.db, identity.subject);
    if (!user || (user.role !== "admin" && user.role !== "superadmin")) {
      throw new ConvexError("Admin access required");
    }

    let programs: Doc<"programs">[];

    if (args.programId) {
      const program = await ctx.db.get(args.programId);
      if (!program) {
        throw new ConvexError("Program not found");
      }
      programs = [program];
    } else {
      programs = await ctx.db
        .query("programs")
        .withIndex("by_active", (q) => q.eq("isActive", true))
        .collect();
    }

    const programStats = await Promise.all(
      programs.map(async (program) => {
        // Get all students in this program
        const allStudents = await ctx.db
          .query("users")
          .withIndex("by_role_active", (q) =>
            q.eq("role", "student").eq("isActive", true),
          )
          .collect();

        const programStudents = allStudents.filter(
          (student) => student.studentProfile?.programId === program._id,
        );

        return {
          program,
          statistics: {
            totalStudents: programStudents.length,
          },
        };
      }),
    );

    return {
      programs: programStats,
      summary: args.programId
        ? null
        : {
            totalPrograms: programs.length,
            totalStudents: programStats.reduce(
              (sum, p) => sum + p.statistics.totalStudents,
              0,
            ),
          },
    };
  },
});

export const getProgramsByCourse = query({
  args: {
    courseId: v.id("courses"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const programLinks = await ctx.db
      .query("program_courses")
      .withIndex("by_course", (q) => q.eq("courseId", args.courseId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    if (programLinks.length === 0) {
      return [];
    }

    const programs = await Promise.all(
      programLinks.map(async (link) => await ctx.db.get(link.programId)),
    );

    return programs
      .filter((program): program is Doc<"programs"> => program !== null)
      .map((program) => ({
        _id: program._id,
        nameEs: program.nameEs,
        nameEn: program.nameEn,
        codeEs: program.codeEs,
        codeEn: program.codeEn,
      }));
  },
});

/**
 * Delete a program (Admin only)
 * Prevents deletion if students are enrolled in the program.
 */
export const deleteProgram = mutation({
  args: {
    programId: v.id("programs"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Not authenticated");
    }

    const user = await getUserByClerkId(ctx.db, identity.subject);
    if (!user || (user.role !== "admin" && user.role !== "superadmin")) {
      throw new ConvexError("Admin access required");
    }

    // Check for students enrolled in this program.
    const studentsInProgram = await ctx.db
      .query("users")
      .withIndex("by_role_active", (q) => q.eq("role", "student"))
      .filter((q) => q.eq(q.field("studentProfile.programId"), args.programId))
      .first();

    if (studentsInProgram) {
      throw new ConvexError(
        "Cannot delete program with enrolled students. Please reassign students first.",
      );
    }

    // Cascade delete: Remove all program_courses relationships
    const programCourses = await ctx.db
      .query("program_courses")
      .withIndex("by_program_course", (q) => q.eq("programId", args.programId))
      .collect();

    for (const programCourse of programCourses) {
      await ctx.db.delete(programCourse._id);
    }

    // Delete the program itself
    await ctx.db.delete(args.programId);
    return { success: true };
  },
});

/**
 * Internal function to recalculate total credits for a program
 * based on associated courses
 */
async function recalculateProgramCredits(
  db: DatabaseReader & DatabaseWriter,
  programId: Id<"programs">,
): Promise<number> {
  // Get all active courses associated with this program
  const programCourses = await db
    .query("program_courses")
    .withIndex("by_program_course", (q) => q.eq("programId", programId))
    .collect();

  // Get the course details and sum up credits
  let totalCredits = 0;
  for (const pc of programCourses) {
    if (pc.isActive) {
      const course = await db.get(pc.courseId);
      if (course && course.isActive) {
        totalCredits += course.credits;
      }
    }
  }

  // Update the program with the new total credits
  await db.patch(programId, { totalCredits });

  return totalCredits;
}

/**
 * Internal mutation to recalculate program credits
 * This can be called from other mutations
 */
export const internalRecalculateProgramCredits = internalMutation({
  args: {
    programId: v.id("programs"),
  },
  handler: async (ctx, args) => {
    return await recalculateProgramCredits(ctx.db, args.programId);
  },
});
