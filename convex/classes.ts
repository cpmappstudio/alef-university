import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

/**
 * Get all classes for a specific course
 */
export const getClassesByCourse = query({
  args: {
    courseId: v.id("courses"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const classes = await ctx.db
      .query("classes")
      .withIndex("by_course_bimester", (q) => q.eq("courseId", args.courseId))
      .collect();

    // Enrich with related data
    const enrichedClasses = await Promise.all(
      classes.map(async (classItem) => {
        const [course, bimester, professor] = await Promise.all([
          ctx.db.get(classItem.courseId),
          ctx.db.get(classItem.bimesterId),
          ctx.db.get(classItem.professorId),
        ]);

        // Count enrolled students
        const enrollments = await ctx.db
          .query("class_enrollments")
          .withIndex("by_class", (q) => q.eq("classId", classItem._id))
          .collect();

        return {
          ...classItem,
          course,
          bimester,
          professor,
          enrolledCount: enrollments.length,
        };
      }),
    );

    return enrichedClasses;
  },
});

/**
 * Get all classes for a specific bimester
 */
export const getClassesByBimester = query({
  args: {
    bimesterId: v.id("bimesters"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const classes = await ctx.db
      .query("classes")
      .withIndex("by_bimester_status_active", (q) =>
        q.eq("bimesterId", args.bimesterId),
      )
      .collect();

    return classes;
  },
});

/**
 * Get all classes for a specific professor
 */
export const getClassesByProfessor = query({
  args: {
    professorId: v.id("users"),
    bimesterId: v.optional(v.id("bimesters")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    if (args.bimesterId) {
      const bimesterId = args.bimesterId;
      const classes = await ctx.db
        .query("classes")
        .withIndex("by_professor_bimester", (q) =>
          q.eq("professorId", args.professorId).eq("bimesterId", bimesterId),
        )
        .collect();
      return classes;
    }

    // Get all classes for professor across all bimesters
    const classes = await ctx.db
      .query("classes")
      .withIndex("by_professor_bimester", (q) =>
        q.eq("professorId", args.professorId),
      )
      .collect();

    return classes;
  },
});

/**
 * Get a single class by ID
 */
export const getClassById = query({
  args: {
    id: v.id("classes"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    return await ctx.db.get(args.id);
  },
});

/**
 * Create a new class
 */
export const createClass = mutation({
  args: {
    courseId: v.id("courses"),
    bimesterId: v.id("bimesters"),
    groupNumber: v.string(),
    professorId: v.id("users"),
    status: v.optional(
      v.union(
        v.literal("draft"),
        v.literal("open"),
        v.literal("closed"),
        v.literal("active"),
        v.literal("grading"),
        v.literal("completed"),
      ),
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Check if class with same course, bimester, and group already exists
    const existing = await ctx.db
      .query("classes")
      .withIndex("by_course_bimester_group", (q) =>
        q
          .eq("courseId", args.courseId)
          .eq("bimesterId", args.bimesterId)
          .eq("groupNumber", args.groupNumber),
      )
      .first();

    if (existing) {
      throw new Error(
        "A class with this course, bimester, and group number already exists",
      );
    }

    const now = Date.now();

    const classId = await ctx.db.insert("classes", {
      courseId: args.courseId,
      bimesterId: args.bimesterId,
      groupNumber: args.groupNumber,
      professorId: args.professorId,
      status: args.status || "draft",
      gradesSubmitted: false,
      isActive: true,
      createdAt: now,
    });

    return classId;
  },
});

/**
 * Update a class
 */
export const updateClass = mutation({
  args: {
    classId: v.id("classes"),
    groupNumber: v.optional(v.string()),
    professorId: v.optional(v.id("users")),
    status: v.optional(
      v.union(
        v.literal("draft"),
        v.literal("open"),
        v.literal("closed"),
        v.literal("active"),
        v.literal("grading"),
        v.literal("completed"),
      ),
    ),
    gradesSubmitted: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const existingClass = await ctx.db.get(args.classId);
    if (!existingClass) {
      throw new Error("Class not found");
    }

    const now = Date.now();
    const updates: any = {
      updatedAt: now,
    };

    if (args.groupNumber !== undefined) {
      updates.groupNumber = args.groupNumber;
    }
    if (args.professorId !== undefined) {
      updates.professorId = args.professorId;
    }
    if (args.status !== undefined) {
      updates.status = args.status;
    }
    if (args.gradesSubmitted !== undefined) {
      updates.gradesSubmitted = args.gradesSubmitted;
      if (args.gradesSubmitted) {
        updates.gradesSubmittedAt = now;
      }
    }

    await ctx.db.patch(args.classId, updates);

    return args.classId;
  },
});

/**
 * Delete a class
 */
export const deleteClass = mutation({
  args: {
    classId: v.id("classes"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const classItem = await ctx.db.get(args.classId);
    if (!classItem) {
      throw new Error("Class not found");
    }

    // Check if there are any enrollments
    const enrollments = await ctx.db
      .query("class_enrollments")
      .withIndex("by_class", (q) => q.eq("classId", args.classId))
      .collect();

    if (enrollments.length > 0) {
      throw new Error(
        "Cannot delete class with enrolled students. Please remove all enrollments first.",
      );
    }

    await ctx.db.delete(args.classId);

    return args.classId;
  },
});
