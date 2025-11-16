import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";

/**
 * Compute class status based on bimester dates
 *
 * Status is computed automatically in real-time based on the current date
 * and the bimester's startDate, endDate, and gradeDeadline.
 *
 * Logic:
 * - If now < bimester.startDate → "open" (class not started yet)
 * - If bimester.startDate <= now < bimester.endDate → "active" (class in session)
 * - If bimester.endDate <= now < bimester.gradeDeadline → "grading" (class ended, grades pending)
 * - If now >= bimester.gradeDeadline → "completed" (grading deadline passed)
 *
 * Example for a class in a bimester with:
 * - startDate: Jan 1, 2024
 * - endDate: Feb 28, 2024
 * - gradeDeadline: Mar 7, 2024
 *
 * Timeline:
 * - Dec 25, 2023: status = "open" (not started)
 * - Jan 15, 2024: status = "active" (bimester running)
 * - Mar 1, 2024: status = "grading" (bimester ended, grades due)
 * - Mar 10, 2024: status = "completed" (deadline passed)
 *
 * Note: The status is computed on every query, so it automatically updates
 * as time passes without needing background jobs or manual updates.
 */
function computeClassStatus(bimester: {
  startDate: number;
  endDate: number;
  gradeDeadline: number;
}): "open" | "active" | "grading" | "completed" {
  const now = Date.now();

  // Compute status based on bimester dates
  if (now < bimester.startDate) return "open";
  if (now >= bimester.startDate && now < bimester.endDate) return "active";
  if (now >= bimester.endDate && now < bimester.gradeDeadline) return "grading";
  return "completed";
}

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

    // Enrich with related data and compute status
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

        // Compute status from bimester dates
        const status = bimester ? computeClassStatus(bimester) : "open";

        return {
          ...classItem,
          status,
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
      .withIndex("by_bimester", (q) => q.eq("bimesterId", args.bimesterId))
      .collect();

    // Get bimester to compute status
    const bimester = await ctx.db.get(args.bimesterId);
    if (!bimester) return [];

    // Return classes with computed status
    return classes.map((classItem) => ({
      ...classItem,
      status: computeClassStatus(bimester),
    }));
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

    const mapWithRelations = async (
      classItem: Doc<"classes">,
      bimester: Doc<"bimesters"> | null,
    ) => {
      const [course, professor, enrollments] = await Promise.all([
        ctx.db.get(classItem.courseId),
        ctx.db.get(classItem.professorId),
        ctx.db
          .query("class_enrollments")
          .withIndex("by_class", (q) => q.eq("classId", classItem._id))
          .collect(),
      ]);

      const status = bimester ? computeClassStatus(bimester) : "open";

      return {
        ...classItem,
        status,
        course: course ?? null,
        bimester: bimester ?? null,
        professor: professor ?? null,
        enrolledCount: enrollments.length,
      };
    };

    if (args.bimesterId) {
      const bimesterId = args.bimesterId;
      const classes = await ctx.db
        .query("classes")
        .withIndex("by_professor_bimester", (q) =>
          q.eq("professorId", args.professorId).eq("bimesterId", bimesterId),
        )
        .collect();

      // Get bimester to compute status
      const bimester = await ctx.db.get(bimesterId);
      if (!bimester) return [];

      return Promise.all(
        classes.map((classItem) => mapWithRelations(classItem, bimester)),
      );
    }

    // Get all classes for professor across all bimesters
    const classes = await ctx.db
      .query("classes")
      .withIndex("by_professor_bimester", (q) =>
        q.eq("professorId", args.professorId),
      )
      .collect();

    // Enrich with computed status and relations
    return Promise.all(
      classes.map(async (classItem) => {
        const bimester = await ctx.db.get(classItem.bimesterId);
        return mapWithRelations(classItem, bimester);
      }),
    );
  },
});

/**
 * Get a single class by ID with enriched data
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

    const classItem = await ctx.db.get(args.id);
    if (!classItem) return null;

    // Get related data
    const [course, bimester, professor] = await Promise.all([
      ctx.db.get(classItem.courseId),
      ctx.db.get(classItem.bimesterId),
      ctx.db.get(classItem.professorId),
    ]);

    if (!bimester) return null;

    // Return class with computed status and enriched data
    return {
      ...classItem,
      status: computeClassStatus(bimester),
      course,
      bimester,
      professor,
    };
  },
});

/**
 * Get enrollments for a specific class with student details
 */
export const getClassEnrollments = query({
  args: {
    classId: v.id("classes"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    // Get all enrollments for this class
    const enrollments = await ctx.db
      .query("class_enrollments")
      .withIndex("by_class", (q) => q.eq("classId", args.classId))
      .collect();

    // Enrich with student details
    const enrichedEnrollments = await Promise.all(
      enrollments.map(async (enrollment) => {
        const student = await ctx.db.get(enrollment.studentId);

        return {
          ...enrollment,
          student,
        };
      }),
    );

    return enrichedEnrollments;
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

    // Get bimester to verify dates
    const bimester = await ctx.db.get(args.bimesterId);
    const now = Date.now();
    console.log("Bimester dates:", {
      startDate: bimester?.startDate,
      endDate: bimester?.endDate,
      gradeDeadline: bimester?.gradeDeadline,
      now,
      isActive: bimester && bimester.startDate <= now && now < bimester.endDate,
    });

    const classId = await ctx.db.insert("classes", {
      courseId: args.courseId,
      bimesterId: args.bimesterId,
      groupNumber: args.groupNumber,
      professorId: args.professorId,
    });

    console.log("Class created with ID:", classId);
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

    const updates: any = {};

    if (args.groupNumber !== undefined) {
      updates.groupNumber = args.groupNumber;
    }
    if (args.professorId !== undefined) {
      updates.professorId = args.professorId;
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

/**
 * Clean up old fields from existing classes (migration helper)
 * Removes: status, createdAt, updatedAt, gradesSubmitted, gradesSubmittedAt, isActive, statusOverride
 */
export const cleanupOldClassFields = mutation({
  args: {},
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const classes = await ctx.db.query("classes").collect();
    let cleaned = 0;

    for (const classItem of classes) {
      const updates: any = {};
      let needsUpdate = false;

      // Check if old fields exist and need to be removed
      const oldFields = [
        "status",
        "createdAt",
        "updatedAt",
        "gradesSubmitted",
        "gradesSubmittedAt",
        "isActive",
        "statusOverride",
      ];

      for (const field of oldFields) {
        if ((classItem as any)[field] !== undefined) {
          updates[field] = undefined;
          needsUpdate = true;
        }
      }

      if (needsUpdate) {
        await ctx.db.patch(classItem._id, updates);
        cleaned++;
      }
    }

    return {
      message: `Cleaned ${cleaned} classes`,
      totalClasses: classes.length,
      cleaned,
    };
  },
});

/**
 * Delete all classes (useful for cleanup/migration)
 * WARNING: This will delete ALL classes in the system
 */
export const deleteAllClasses = mutation({
  args: {},
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const classes = await ctx.db.query("classes").collect();

    for (const classItem of classes) {
      await ctx.db.delete(classItem._id);
    }

    return {
      message: `Deleted ${classes.length} classes`,
      count: classes.length,
    };
  },
});

/**
 * Add a student to a class
 */
export const addStudentToClass = mutation({
  args: {
    classId: v.id("classes"),
    studentId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Verify class exists
    const classItem = await ctx.db.get(args.classId);
    if (!classItem) {
      throw new Error("Class not found");
    }

    // Verify student exists and is a student
    const student = await ctx.db.get(args.studentId);
    if (!student || student.role !== "student") {
      throw new Error("Invalid student");
    }

    // Check if student is already enrolled
    const existingEnrollment = await ctx.db
      .query("class_enrollments")
      .withIndex("by_class", (q) => q.eq("classId", args.classId))
      .filter((q) => q.eq(q.field("studentId"), args.studentId))
      .first();

    if (existingEnrollment) {
      throw new Error("Student is already enrolled in this class");
    }

    // Get user who is adding the student
    const users = await ctx.db.query("users").collect();
    const currentUser = users.find((u) => u.clerkId === identity.subject);
    if (!currentUser) {
      throw new Error("Current user not found");
    }

    // Create enrollment
    const now = Date.now();
    const enrollmentId = await ctx.db.insert("class_enrollments", {
      classId: args.classId,
      studentId: args.studentId,
      courseId: classItem.courseId,
      bimesterId: classItem.bimesterId,
      professorId: classItem.professorId,
      enrolledAt: now,
      enrolledBy: currentUser._id,
      status: "enrolled",
      isRetake: false,
      isAuditing: false,
      countsForGPA: true,
      countsForProgress: true,
      createdAt: now,
    });

    return enrollmentId;
  },
});

/**
 * Remove a student from a class
 */
export const removeStudentFromClass = mutation({
  args: {
    classId: v.id("classes"),
    studentId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Find the enrollment
    const enrollment = await ctx.db
      .query("class_enrollments")
      .withIndex("by_class", (q) => q.eq("classId", args.classId))
      .filter((q) => q.eq(q.field("studentId"), args.studentId))
      .first();

    if (!enrollment) {
      throw new Error("Student is not enrolled in this class");
    }

    // Delete the enrollment
    await ctx.db.delete(enrollment._id);

    return enrollment._id;
  },
});

/**
 * Get all students (for adding to classes)
 */
export const getAllStudents = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const students = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("role"), "student"))
      .collect();

    return students;
  },
});
