// ################################################################################
// # File: courses.ts                                                            #
// # Authors: Juan Camilo Narváez Tascón (github.com/ulvenforst)                  #
// # Creation date: 08/23/2025                                                    #
// # License: Apache License 2.0                                                  #
// ################################################################################

/**
 * Course and section management functions
 * Handles course catalog, section creation, and course-program relationships
 */

import { query, mutation, internalMutation } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import {
  getUserByClerkId,
  getCurrentPeriod,
  hasAvailableCapacity,
} from "./helpers";
import {
  courseCategoryValidator,
  languageValidator,
  deliveryMethodValidator,
  sectionStatusValidator,
  scheduleSessionValidator,
} from "./types";
import { internal } from "./_generated/api";

/**
 * Get all courses with filtering options
 */
export const getAllCourses = query({
  args: {
    programId: v.optional(v.id("programs")),
    category: v.optional(courseCategoryValidator),
    language: v.optional(languageValidator),
    isActive: v.optional(v.boolean()),
    searchTerm: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    let courses: Doc<"courses">[];

    // Use appropriate index based on filters
    if (args.category !== undefined && args.isActive !== undefined) {
      courses = await ctx.db
        .query("courses")
        .withIndex("by_category_active", (q) =>
          q.eq("category", args.category!).eq("isActive", args.isActive!),
        )
        .collect();
    } else if (args.language !== undefined && args.isActive !== undefined) {
      courses = await ctx.db
        .query("courses")
        .withIndex("by_language_active", (q) =>
          q.eq("language", args.language!).eq("isActive", args.isActive!),
        )
        .collect();
    } else if (args.isActive !== undefined) {
      courses = await ctx.db
        .query("courses")
        .withIndex("by_active", (q) => q.eq("isActive", args.isActive!))
        .collect();
    } else {
      courses = await ctx.db.query("courses").collect();
    }

    // Apply additional filters
    if (args.category !== undefined && args.isActive === undefined) {
      courses = courses.filter((course) => course.category === args.category);
    }
    if (args.language !== undefined && args.isActive === undefined) {
      courses = courses.filter((course) => course.language === args.language);
    }

    // Apply search term filter
    if (args.searchTerm) {
      const searchLower = args.searchTerm.toLowerCase();
      courses = courses.filter(
        (course) =>
          course.codeEs?.toLowerCase().includes(searchLower) ||
          course.codeEn?.toLowerCase().includes(searchLower) ||
          course.nameEs?.toLowerCase().includes(searchLower) ||
          course.nameEn?.toLowerCase().includes(searchLower),
      );
    }

    // Filter by program if specified
    if (args.programId) {
      const programCourses = await ctx.db
        .query("program_courses")
        .withIndex("by_program_course", (q) =>
          q.eq("programId", args.programId!),
        )
        .collect();

      const programCourseIds = new Set(programCourses.map((pc) => pc.courseId));
      courses = courses.filter((course) => programCourseIds.has(course._id));
    }

    // Enrich courses with program information
    const coursesWithPrograms = await Promise.all(
      courses.map(async (course) => {
        // Get all program associations for this course
        const programAssociations = await ctx.db
          .query("program_courses")
          .withIndex("by_course", (q) => q.eq("courseId", course._id))
          .filter((q) => q.eq(q.field("isActive"), true))
          .collect();

        // Get program details
        const programs = await Promise.all(
          programAssociations.map(async (assoc) => {
            const program = await ctx.db.get(assoc.programId);
            if (!program) return null;
            return {
              _id: program._id,
              codeEs: program.codeEs || program.codeEn || "N/A",
              name: program.nameEs || program.nameEn || "N/A",
            };
          }),
        );

        return {
          ...course,
          programs: programs.filter((p) => p !== null),
        };
      }),
    );

    return coursesWithPrograms;
  },
});

/**
 * Check if a course code already exists in any language field (codeEs or codeEn)
 */
export const checkCourseCodeExists = query({
  args: {
    code: v.string(),
    excludeCourseId: v.optional(v.id("courses")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return false;
    }

    const trimmedCode = args.code.trim();
    if (trimmedCode === "") {
      return false;
    }

    // Check if the code exists in either codeEs or codeEn fields
    const allCourses = await ctx.db.query("courses").collect();

    const duplicateCourses = allCourses.filter((c) => {
      // Exclude the course we're editing (if any)
      if (args.excludeCourseId && c._id === args.excludeCourseId) {
        return false;
      }

      // Check if code matches either Spanish or English code
      return c.codeEs === trimmedCode || c.codeEn === trimmedCode;
    });

    return duplicateCourses.length > 0;
  },
});

/**
 * Create new course (Admin only)
 */
export const createCourse = mutation({
  args: {
    codeEs: v.optional(v.string()), // Required when language is "es" or "both"
    codeEn: v.optional(v.string()), // Required when language is "en" or "both"
    nameEs: v.optional(v.string()), // Required when language is "es" or "both"
    nameEn: v.optional(v.string()), // Required when language is "en" or "both"
    descriptionEs: v.optional(v.string()), // Required when language is "es" or "both"
    descriptionEn: v.optional(v.string()), // Required when language is "en" or "both"
    credits: v.number(),
    language: languageValidator,
    category: courseCategoryValidator,
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

    // Validate language-specific fields
    if (args.language === "es" || args.language === "both") {
      if (!args.codeEs || !args.nameEs || !args.descriptionEs) {
        throw new ConvexError(
          "Spanish fields (codeEs, nameEs, descriptionEs) are required when language is Spanish or both",
        );
      }
    }
    if (args.language === "en" || args.language === "both") {
      if (!args.codeEn || !args.nameEn || !args.descriptionEn) {
        throw new ConvexError(
          "English fields (codeEn, nameEn, descriptionEn) are required when language is English or both",
        );
      }
    }

    // Check for duplicate course codes (scan all courses since we removed the index)
    const allCourses = await ctx.db.query("courses").collect();

    // Check for duplicate codes (codes must be unique globally across all language fields)
    if (args.codeEs) {
      const duplicateCode = allCourses.find(
        (c) =>
          c.codeEs?.toLowerCase() === args.codeEs!.toLowerCase() ||
          c.codeEn?.toLowerCase() === args.codeEs!.toLowerCase(),
      );
      if (duplicateCode) {
        throw new ConvexError(
          `Course code "${args.codeEs}" already exists in another course`,
        );
      }
    }

    if (args.codeEn) {
      const duplicateCodeEn = allCourses.find(
        (c) =>
          c.codeEs?.toLowerCase() === args.codeEn!.toLowerCase() ||
          c.codeEn?.toLowerCase() === args.codeEn!.toLowerCase(),
      );
      if (duplicateCodeEn) {
        throw new ConvexError(
          `Course code "${args.codeEn}" already exists in another course`,
        );
      }
    }

    // Validate credits
    if (args.credits <= 0) {
      throw new ConvexError("Credits must be greater than 0");
    }

    // Create course
    const courseId = await ctx.db.insert("courses", {
      ...args,
      isActive: true,
      createdAt: Date.now(),
    });

    return courseId;
  },
});

/**
 * Get all courses for a specific program
 */
export const getCourseById = query({
  args: {
    id: v.id("courses"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const course = await ctx.db.get(args.id);
    return course;
  },
});

export const getCoursesByProgram = query({
  args: {
    programId: v.id("programs"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    // Get all program_courses relationships for this program
    const programCourses = await ctx.db
      .query("program_courses")
      .withIndex("by_program_course", (q) => q.eq("programId", args.programId))
      .collect();

    // Get the actual course documents
    const courses = await Promise.all(
      programCourses.map(async (pc) => {
        const course = await ctx.db.get(pc.courseId);
        return course;
      }),
    );

    // Filter out null values (in case a course was deleted)
    return courses.filter((course) => course !== null);
  },
});

export const internalCreateCourse = internalMutation({
  args: {
    codeEs: v.optional(v.string()), // Required when language is "es" or "both"
    codeEn: v.optional(v.string()), // Required when language is "en" or "both"
    nameEs: v.optional(v.string()), // Required when language is "es" or "both"
    nameEn: v.optional(v.string()), // Required when language is "en" or "both"
    descriptionEs: v.optional(v.string()), // Required when language is "es" or "both"
    descriptionEn: v.optional(v.string()), // Required when language is "en" or "both"
    credits: v.number(),
    language: languageValidator,
    category: courseCategoryValidator,
  },
  handler: async (ctx, args) => {
    // Validate language-specific fields
    if (args.language === "es" || args.language === "both") {
      if (!args.codeEs || !args.nameEs || !args.descriptionEs) {
        throw new ConvexError(
          "Spanish fields (codeEs, nameEs, descriptionEs) are required when language is Spanish or both",
        );
      }
    }
    if (args.language === "en" || args.language === "both") {
      if (!args.codeEn || !args.nameEn || !args.descriptionEn) {
        throw new ConvexError(
          "English fields (codeEn, nameEn, descriptionEn) are required when language is English or both",
        );
      }
    }

    // Check for duplicate course codes (scan all courses since we removed the index)
    const allCourses = await ctx.db.query("courses").collect();

    // Check for duplicate codes (codes must be unique globally across all language fields)
    if (args.codeEs) {
      const duplicateCode = allCourses.find(
        (c) =>
          c.codeEs?.toLowerCase() === args.codeEs!.toLowerCase() ||
          c.codeEn?.toLowerCase() === args.codeEs!.toLowerCase(),
      );
      if (duplicateCode) {
        throw new ConvexError(
          `Course code "${args.codeEs}" already exists in another course`,
        );
      }
    }

    if (args.codeEn) {
      const duplicateCodeEn = allCourses.find(
        (c) =>
          c.codeEs?.toLowerCase() === args.codeEn!.toLowerCase() ||
          c.codeEn?.toLowerCase() === args.codeEn!.toLowerCase(),
      );
      if (duplicateCodeEn) {
        throw new ConvexError(
          `Course code "${args.codeEn}" already exists in another course`,
        );
      }
    }

    // Validate credits
    if (args.credits <= 0) {
      throw new ConvexError("Credits must be greater than 0");
    }

    // Create course
    const courseId = await ctx.db.insert("courses", {
      ...args,
      isActive: true,
      createdAt: Date.now(),
    });

    return courseId;
  },
});

/**
 * Update existing course (Admin only)
 */
export const updateCourse = mutation({
  args: {
    courseId: v.id("courses"),
    codeEs: v.optional(v.string()), // Can be updated now
    codeEn: v.optional(v.string()), // Can be updated now
    nameEs: v.optional(v.string()),
    nameEn: v.optional(v.string()),
    descriptionEs: v.optional(v.string()),
    descriptionEn: v.optional(v.string()),
    credits: v.optional(v.number()),
    language: v.optional(languageValidator),
    category: v.optional(courseCategoryValidator),
    isActive: v.optional(v.boolean()),
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

    const course = await ctx.db.get(args.courseId);
    if (!course) {
      throw new ConvexError("Course not found");
    }

    // Determine the final language value (use provided or existing)
    const finalLanguage =
      args.language !== undefined ? args.language : course.language;

    // Validate language-specific fields
    if (finalLanguage === "es" || finalLanguage === "both") {
      const finalCode = args.codeEs !== undefined ? args.codeEs : course.codeEs;
      const finalNameEs =
        args.nameEs !== undefined ? args.nameEs : course.nameEs;
      const finalDescriptionEs =
        args.descriptionEs !== undefined
          ? args.descriptionEs
          : course.descriptionEs;

      if (!finalCode || !finalNameEs || !finalDescriptionEs) {
        throw new ConvexError(
          "Spanish fields (codeEs, nameEs, descriptionEs) are required when language is Spanish or both",
        );
      }
    }
    if (finalLanguage === "en" || finalLanguage === "both") {
      const finalCodeEn =
        args.codeEn !== undefined ? args.codeEn : course.codeEn;
      const finalNameEn =
        args.nameEn !== undefined ? args.nameEn : course.nameEn;
      const finalDescriptionEn =
        args.descriptionEn !== undefined
          ? args.descriptionEn
          : course.descriptionEn;

      if (!finalCodeEn || !finalNameEn || !finalDescriptionEn) {
        throw new ConvexError(
          "English fields (codeEn, nameEn, descriptionEn) are required when language is English or both",
        );
      }
    }

    // Check for duplicate codes (excluding current course)
    const allCourses = await ctx.db.query("courses").collect();

    // Check for duplicate codes (codes must be unique globally across all language fields)
    if (args.codeEs !== undefined) {
      const duplicateCode = allCourses.find(
        (c) =>
          c._id !== args.courseId &&
          (c.codeEs?.toLowerCase() === args.codeEs!.toLowerCase() ||
            c.codeEn?.toLowerCase() === args.codeEs!.toLowerCase()),
      );
      if (duplicateCode) {
        throw new ConvexError(
          `Course code "${args.codeEs}" already exists in another course`,
        );
      }
    }

    if (args.codeEn !== undefined) {
      const duplicateCodeEn = allCourses.find(
        (c) =>
          c._id !== args.courseId &&
          (c.codeEs?.toLowerCase() === args.codeEn!.toLowerCase() ||
            c.codeEn?.toLowerCase() === args.codeEn!.toLowerCase()),
      );
      if (duplicateCodeEn) {
        throw new ConvexError(
          `Course code "${args.codeEn}" already exists in another course`,
        );
      }
    }

    // Validate credits if provided
    if (args.credits !== undefined && args.credits <= 0) {
      throw new ConvexError("Credits must be greater than 0");
    }

    // Update course
    const updateData: any = { updatedAt: Date.now() };

    if (args.codeEs !== undefined) updateData.codeEs = args.codeEs;
    if (args.codeEn !== undefined) updateData.codeEn = args.codeEn;
    if (args.nameEs !== undefined) updateData.nameEs = args.nameEs;
    if (args.nameEn !== undefined) updateData.nameEn = args.nameEn;
    if (args.descriptionEs !== undefined)
      updateData.descriptionEs = args.descriptionEs;
    if (args.descriptionEn !== undefined)
      updateData.descriptionEn = args.descriptionEn;
    if (args.credits !== undefined) updateData.credits = args.credits;
    if (args.language !== undefined) updateData.language = args.language;
    if (args.category !== undefined) updateData.category = args.category;
    if (args.isActive !== undefined) updateData.isActive = args.isActive;

    await ctx.db.patch(args.courseId, updateData);

    // If credits changed, recalculate total credits for all programs using this course
    if (args.credits !== undefined && args.credits !== course.credits) {
      const programCourses = await ctx.db
        .query("program_courses")
        .withIndex("by_course", (q) => q.eq("courseId", args.courseId))
        .collect();

      for (const pc of programCourses) {
        await ctx.scheduler.runAfter(
          0,
          internal.programs.internalRecalculateProgramCredits,
          {
            programId: pc.programId,
          },
        );
      }
    }

    return { message: "Course updated successfully" };
  },
});

/**
 * Get course with sections for a specific period
 */
export const getCourseWithSections = query({
  args: {
    courseId: v.id("courses"),
    periodId: v.optional(v.id("periods")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Not authenticated");
    }

    const course = await ctx.db.get(args.courseId);
    if (!course) {
      throw new ConvexError("Course not found");
    }

    // Get target period
    const targetPeriod = args.periodId
      ? await ctx.db.get(args.periodId)
      : await getCurrentPeriod(ctx.db);

    // If no period exists, return course with empty sections
    if (!targetPeriod) {
      return {
        course,
        period: null,
        sections: [],
      };
    }

    // Get sections for this course in the period
    const sections = await ctx.db
      .query("sections")
      .withIndex("by_course_period", (q) =>
        q.eq("courseId", args.courseId).eq("periodId", targetPeriod._id),
      )
      .collect();

    // Get section details with professor info
    const sectionDetails = await Promise.all(
      sections.map(async (section) => {
        const professor = await ctx.db.get(section.professorId);

        // Get enrollment count
        const enrollments = await ctx.db
          .query("enrollments")
          .withIndex("by_section", (q) => q.eq("sectionId", section._id))
          .collect();

        return {
          section,
          professor,
          enrollmentStats: {
            enrolled: enrollments.filter((e) => e.status === "enrolled").length,
            capacity: section.capacity,
            available: section.capacity - section.enrolled,
          },
        };
      }),
    );

    return {
      course,
      period: targetPeriod,
      sections: sectionDetails,
    };
  },
});

/**
 * Get programs associated with a course
 */
export const getCoursePrograms = query({
  args: {
    courseId: v.id("courses"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Not authenticated");
    }

    // Get all program_courses associations for this course
    const associations = await ctx.db
      .query("program_courses")
      .withIndex("by_course", (q) => q.eq("courseId", args.courseId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    // Get program details
    const programDetails = await Promise.all(
      associations.map(async (assoc) => {
        const program = await ctx.db.get(assoc.programId);
        if (!program) return null;

        return {
          programId: assoc.programId,
          programCode: program.codeEs,
          programName: program.nameEs,
          isRequired: assoc.isRequired,
          categoryOverride: assoc.categoryOverride,
          associationId: assoc._id,
        };
      }),
    );

    return programDetails.filter((p) => p !== null);
  },
});

/**
 * Create new section (Admin/Professor)
 */
export const createSection = mutation({
  args: {
    courseId: v.id("courses"),
    periodId: v.id("periods"),
    groupNumber: v.string(),
    professorId: v.id("users"),
    capacity: v.number(),
    deliveryMethod: deliveryMethodValidator,
    schedule: v.optional(
      v.object({
        sessions: v.array(scheduleSessionValidator),
        timezone: v.string(),
        notes: v.optional(v.string()),
      }),
    ),
    waitlistCapacity: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Not authenticated");
    }

    const user = await getUserByClerkId(ctx.db, identity.subject);
    if (
      !user ||
      (user.role !== "admin" &&
        user.role !== "superadmin" &&
        user.role !== "professor")
    ) {
      throw new ConvexError("Admin or Professor access required");
    }

    const course = await ctx.db.get(args.courseId);
    if (!course) {
      throw new ConvexError("Course not found");
    }

    const period = await ctx.db.get(args.periodId);
    if (!period) {
      throw new ConvexError("Period not found");
    }

    const professor = await ctx.db.get(args.professorId);
    if (!professor || professor.role !== "professor") {
      throw new ConvexError("Professor not found or invalid role");
    }

    // If user is professor, they can only create sections for themselves
    if (user.role === "professor" && args.professorId !== user._id) {
      throw new ConvexError(
        "Professors can only create sections for themselves",
      );
    }

    // Note: Capacity validation removed - sections have unlimited capacity

    // Generate CRN (Course Reference Number)
    const crn = `${course.codeEs}-${args.groupNumber}-${period.code}`;

    // Check for duplicate CRN
    const existingSection = await ctx.db
      .query("sections")
      .withIndex("by_crn", (q) => q.eq("crn", crn))
      .first();

    if (existingSection) {
      throw new ConvexError(
        "Section with this group number already exists for this period",
      );
    }

    // Create section
    const sectionId = await ctx.db.insert("sections", {
      courseId: args.courseId,
      periodId: args.periodId,
      groupNumber: args.groupNumber,
      crn,
      professorId: args.professorId,
      capacity: args.capacity,
      enrolled: 0,
      waitlistCapacity: args.waitlistCapacity,
      waitlisted: 0,
      deliveryMethod: args.deliveryMethod,
      schedule: args.schedule,
      status: "draft",
      gradesSubmitted: false,
      isActive: true,
      createdAt: Date.now(),
    });

    return {
      sectionId,
      crn,
      message: "Section created successfully",
    };
  },
});

export const internalCreateSection = internalMutation({
  args: {
    courseId: v.id("courses"),
    periodId: v.id("periods"),
    groupNumber: v.string(),
    professorId: v.id("users"),
    capacity: v.number(),
    deliveryMethod: deliveryMethodValidator,
    schedule: v.optional(
      v.object({
        sessions: v.array(scheduleSessionValidator),
        timezone: v.string(),
        notes: v.optional(v.string()),
      }),
    ),
    waitlistCapacity: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const course = await ctx.db.get(args.courseId);
    if (!course) {
      throw new ConvexError("Course not found");
    }

    const period = await ctx.db.get(args.periodId);
    if (!period) {
      throw new ConvexError("Period not found");
    }

    const professor = await ctx.db.get(args.professorId);
    if (!professor || professor.role !== "professor") {
      throw new ConvexError("Professor not found or invalid role");
    }

    // Generate CRN (Course Reference Number)
    const crn = `${course.codeEs}-${args.groupNumber}-${period.code}`;

    // Check for duplicate CRN
    const existingSection = await ctx.db
      .query("sections")
      .withIndex("by_crn", (q) => q.eq("crn", crn))
      .first();

    if (existingSection) {
      throw new ConvexError(
        "Section with this group number already exists for this period",
      );
    }

    // Create section
    const sectionId = await ctx.db.insert("sections", {
      courseId: args.courseId,
      periodId: args.periodId,
      groupNumber: args.groupNumber,
      crn,
      professorId: args.professorId,
      capacity: args.capacity,
      enrolled: 0,
      waitlistCapacity: args.waitlistCapacity,
      waitlisted: 0,
      deliveryMethod: args.deliveryMethod,
      schedule: args.schedule,
      status: "draft",
      gradesSubmitted: false,
      isActive: true,
      createdAt: Date.now(),
    });

    return {
      sectionId,
      crn,
      message: "Section created successfully",
    };
  },
});

/**
 * Update section details (Admin/Professor who owns section)
 */
export const updateSection = mutation({
  args: {
    sectionId: v.id("sections"),
    capacity: v.optional(v.number()),
    deliveryMethod: v.optional(deliveryMethodValidator),
    schedule: v.optional(
      v.object({
        sessions: v.array(scheduleSessionValidator),
        timezone: v.string(),
        notes: v.optional(v.string()),
      }),
    ),
    status: v.optional(sectionStatusValidator),
    waitlistCapacity: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Not authenticated");
    }

    const user = await getUserByClerkId(ctx.db, identity.subject);
    if (!user) {
      throw new ConvexError("User not found");
    }

    const section = await ctx.db.get(args.sectionId);
    if (!section) {
      throw new ConvexError("Section not found");
    }

    // Check permissions
    const canEdit =
      user.role === "admin" ||
      user.role === "superadmin" ||
      (user.role === "professor" && section.professorId === user._id);

    if (!canEdit) {
      throw new ConvexError("Permission denied");
    }

    // Note: Capacity validation removed - sections have unlimited capacity

    // Update section
    const updateData: any = { updatedAt: Date.now() };

    if (args.capacity !== undefined) updateData.capacity = args.capacity;
    if (args.deliveryMethod !== undefined)
      updateData.deliveryMethod = args.deliveryMethod;
    if (args.schedule !== undefined) updateData.schedule = args.schedule;
    if (args.status !== undefined) updateData.status = args.status;
    if (args.waitlistCapacity !== undefined)
      updateData.waitlistCapacity = args.waitlistCapacity;

    await ctx.db.patch(args.sectionId, updateData);

    return args.sectionId;
  },
});

export const internalUpdateSection = internalMutation({
  args: {
    sectionId: v.id("sections"),
    capacity: v.optional(v.number()),
    deliveryMethod: v.optional(deliveryMethodValidator),
    schedule: v.optional(
      v.object({
        sessions: v.array(scheduleSessionValidator),
        timezone: v.string(),
        notes: v.optional(v.string()),
      }),
    ),
    status: v.optional(sectionStatusValidator),
    waitlistCapacity: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const section = await ctx.db.get(args.sectionId);
    if (!section) {
      throw new ConvexError("Section not found");
    }

    // Update section
    const updateData: any = { updatedAt: Date.now() };

    if (args.capacity !== undefined) updateData.capacity = args.capacity;
    if (args.deliveryMethod !== undefined)
      updateData.deliveryMethod = args.deliveryMethod;
    if (args.schedule !== undefined) updateData.schedule = args.schedule;
    if (args.status !== undefined) updateData.status = args.status;
    if (args.waitlistCapacity !== undefined)
      updateData.waitlistCapacity = args.waitlistCapacity;

    await ctx.db.patch(args.sectionId, updateData);

    return args.sectionId;
  },
});

/**
 * Get sections for a period with filtering
 */
export const getSectionsByPeriod = query({
  args: {
    periodId: v.optional(v.id("periods")),
    professorId: v.optional(v.id("users")),
    courseId: v.optional(v.id("courses")),
    status: v.optional(sectionStatusValidator),
    hasAvailableSeats: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Not authenticated");
    }

    // Get target period
    const targetPeriod = args.periodId
      ? await ctx.db.get(args.periodId)
      : await getCurrentPeriod(ctx.db);

    // If no period exists, return empty result instead of throwing error
    if (!targetPeriod) {
      return {
        period: null,
        sections: [],
      };
    }

    let sections: Doc<"sections">[];

    // Use appropriate index based on filters
    if (args.professorId) {
      sections = await ctx.db
        .query("sections")
        .withIndex("by_professor_period", (q) =>
          q
            .eq("professorId", args.professorId!)
            .eq("periodId", targetPeriod._id)
            .eq("isActive", true),
        )
        .collect();
    } else if (args.courseId) {
      sections = await ctx.db
        .query("sections")
        .withIndex("by_course_period", (q) =>
          q.eq("courseId", args.courseId!).eq("periodId", targetPeriod._id),
        )
        .collect();
    } else {
      sections = await ctx.db
        .query("sections")
        .filter((q) => q.eq(q.field("periodId"), targetPeriod._id))
        .collect();
    }

    // Apply additional filters
    if (args.status) {
      sections = sections.filter((section) => section.status === args.status);
    }

    if (args.hasAvailableSeats) {
      sections = sections.filter((section) => hasAvailableCapacity(section));
    }

    // Get section details
    const sectionDetails = await Promise.all(
      sections.map(async (section) => {
        const [course, professor] = await Promise.all([
          ctx.db.get(section.courseId),
          ctx.db.get(section.professorId),
        ]);

        // Get enrollment statistics
        const enrollments = await ctx.db
          .query("enrollments")
          .withIndex("by_section", (q) => q.eq("sectionId", section._id))
          .collect();

        return {
          section,
          course,
          professor,
          enrollmentStats: {
            enrolled: enrollments.filter((e) => e.status === "enrolled").length,
            totalEnrollments: enrollments.length,
            capacity: section.capacity,
            available: section.capacity - section.enrolled,
            hasCapacity: hasAvailableCapacity(section),
          },
        };
      }),
    );

    return {
      period: targetPeriod,
      sections: sectionDetails,
    };
  },
});

/**
 * Delete section (Admin only)
 */
export const deleteSection = mutation({
  args: {
    sectionId: v.id("sections"),
    forceDelete: v.optional(v.boolean()),
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

    const section = await ctx.db.get(args.sectionId);
    if (!section) {
      throw new ConvexError("Section not found");
    }

    // Check for enrollments
    const enrollments = await ctx.db
      .query("enrollments")
      .withIndex("by_section", (q) => q.eq("sectionId", args.sectionId))
      .collect();

    if (enrollments.length > 0 && !args.forceDelete) {
      throw new ConvexError(
        `Cannot delete section with ${enrollments.length} enrollments. Use forceDelete to override.`,
      );
    }

    // If force delete, remove all enrollments first
    if (args.forceDelete) {
      for (const enrollment of enrollments) {
        await ctx.db.delete(enrollment._id);
      }
    }

    // Delete section
    await ctx.db.delete(args.sectionId);

    return {
      message: "Section deleted successfully",
      deletedEnrollments: args.forceDelete ? enrollments.length : 0,
    };
  },
});

/**
 * Associate course with program (Admin only)
 */
export const addCourseToProgram = mutation({
  args: {
    courseId: v.id("courses"),
    programId: v.id("programs"),
    isRequired: v.boolean(),
    categoryOverride: v.optional(courseCategoryValidator),
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

    // Check if association already exists
    const existing = await ctx.db
      .query("program_courses")
      .withIndex("by_program_course", (q) =>
        q.eq("programId", args.programId).eq("courseId", args.courseId),
      )
      .first();

    if (existing) {
      throw new ConvexError("Course is already associated with this program");
    }

    const course = await ctx.db.get(args.courseId);
    const program = await ctx.db.get(args.programId);

    if (!course || !program) {
      throw new ConvexError("Course or program not found");
    }

    // Create association
    const associationId = await ctx.db.insert("program_courses", {
      courseId: args.courseId,
      programId: args.programId,
      isRequired: args.isRequired,
      categoryOverride: args.categoryOverride,
      isActive: true,
      createdAt: Date.now(),
    });

    // Recalculate total credits for the program
    await ctx.scheduler.runAfter(
      0,
      internal.programs.internalRecalculateProgramCredits,
      {
        programId: args.programId,
      },
    );

    return associationId;
  },
});

export const internalAddCourseToProgram = internalMutation({
  args: {
    courseId: v.id("courses"),
    programId: v.id("programs"),
    isRequired: v.boolean(),
    categoryOverride: v.optional(courseCategoryValidator),
  },
  handler: async (ctx, args) => {
    // Check if association already exists
    const existing = await ctx.db
      .query("program_courses")
      .withIndex("by_program_course", (q) =>
        q.eq("programId", args.programId).eq("courseId", args.courseId),
      )
      .first();

    if (existing) {
      throw new ConvexError("Course is already associated with this program");
    }

    const course = await ctx.db.get(args.courseId);
    const program = await ctx.db.get(args.programId);

    if (!course || !program) {
      throw new ConvexError("Course or program not found");
    }

    // Create association
    const associationId = await ctx.db.insert("program_courses", {
      courseId: args.courseId,
      programId: args.programId,
      isRequired: args.isRequired,
      categoryOverride: args.categoryOverride,
      isActive: true,
      createdAt: Date.now(),
    });

    // Recalculate total credits for the program
    await ctx.scheduler.runAfter(
      0,
      internal.programs.internalRecalculateProgramCredits,
      {
        programId: args.programId,
      },
    );

    return associationId;
  },
});

/**
 * Remove course from program (Admin only)
 */
export const removeCourseFromProgram = mutation({
  args: {
    courseId: v.id("courses"),
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

    const association = await ctx.db
      .query("program_courses")
      .withIndex("by_program_course", (q) =>
        q.eq("programId", args.programId).eq("courseId", args.courseId),
      )
      .first();

    if (!association) {
      throw new ConvexError("Course is not associated with this program");
    }

    await ctx.db.delete(association._id);

    // Recalculate total credits for the program
    await ctx.scheduler.runAfter(
      0,
      internal.programs.internalRecalculateProgramCredits,
      {
        programId: args.programId,
      },
    );

    return {
      message: "Course removed from program successfully",
    };
  },
});

/**
 * Get classes count for a course
 */
export const getCourseClasses = query({
  args: {
    courseId: v.id("courses"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Not authenticated");
    }

    const classes = await ctx.db
      .query("classes")
      .withIndex("by_course_bimester", (q) => q.eq("courseId", args.courseId))
      .collect();

    return classes.length;
  },
});

/**
 * Delete a course (Admin only)
 * This prevents deletion if there are any enrollments associated with the course.
 */
export const deleteCourse = mutation({
  args: {
    courseId: v.id("courses"),
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

    // Check if any student is enrolled in this course across all sections/periods
    const enrollments = await ctx.db
      .query("enrollments")
      .filter((q) => q.eq(q.field("courseId"), args.courseId))
      .collect();

    if (enrollments.length > 0) {
      throw new ConvexError(
        `Cannot delete course with active or past enrollments (${enrollments.length}). Please deactivate the course instead.`,
      );
    }

    // Check for sections
    const sections = await ctx.db
      .query("sections")
      .withIndex("by_course_period", (q) => q.eq("courseId", args.courseId))
      .collect();

    if (sections.length > 0) {
      throw new ConvexError(
        `Cannot delete course with existing sections (${sections.length}). Please delete the sections first.`,
      );
    }

    // Delete all classes associated with this course
    const classes = await ctx.db
      .query("classes")
      .withIndex("by_course_bimester", (q) => q.eq("courseId", args.courseId))
      .collect();

    // Delete all class_enrollments for each class
    for (const classDoc of classes) {
      const classEnrollments = await ctx.db
        .query("class_enrollments")
        .withIndex("by_class", (q) => q.eq("classId", classDoc._id))
        .collect();

      for (const enrollment of classEnrollments) {
        await ctx.db.delete(enrollment._id);
      }

      // Delete the class itself
      await ctx.db.delete(classDoc._id);
    }

    // Delete all program_courses associations
    const programCourses = await ctx.db
      .query("program_courses")
      .withIndex("by_course", (q) => q.eq("courseId", args.courseId))
      .collect();

    for (const programCourse of programCourses) {
      await ctx.db.delete(programCourse._id);
    }

    // Finally, delete the course
    await ctx.db.delete(args.courseId);

    return { success: true };
  },
});
