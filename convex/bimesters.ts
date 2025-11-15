import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";

/**
 * Get all bimesters with computed active status based on current date
 */
export const getAllBimesters = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const now = Date.now();
    const bimesters = await ctx.db.query("bimesters").order("desc").collect();

    // Return bimesters with computed isActive based on current date
    return bimesters.map((bimester) => ({
      ...bimester,
      isActive: bimester.startDate <= now && now < bimester.endDate,
    }));
  },
});

/**
 * Get active bimester based on current date
 */
export const getActiveBimester = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const now = Date.now();
    const allBimesters = await ctx.db.query("bimesters").collect();

    // Find the bimester that contains the current date
    const activeBimester = allBimesters.find(
      (b) => b.startDate <= now && now < b.endDate,
    );

    if (!activeBimester) {
      return null;
    }

    return {
      ...activeBimester,
      isActive: true,
    };
  },
});

/**
 * Get bimester by ID
 */
export const getBimesterById = query({
  args: {
    id: v.id("bimesters"),
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
 * Create a new bimester
 */
export const createBimester = mutation({
  args: {
    startDate: v.number(),
    endDate: v.number(),
    gradeDeadline: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Validate dates
    if (args.startDate >= args.endDate) {
      throw new Error("Start date must be before end date");
    }

    if (args.gradeDeadline < args.endDate) {
      throw new Error("Grade deadline must be after or equal to end date");
    }

    // Check for overlapping bimesters
    const allBimesters = await ctx.db.query("bimesters").collect();
    const hasOverlap = allBimesters.some((b) => {
      return (
        (args.startDate >= b.startDate && args.startDate < b.endDate) ||
        (args.endDate > b.startDate && args.endDate <= b.endDate) ||
        (args.startDate <= b.startDate && args.endDate >= b.endDate)
      );
    });

    if (hasOverlap) {
      throw new Error("This bimester overlaps with an existing one");
    }

    const now = Date.now();

    const bimesterId = await ctx.db.insert("bimesters", {
      startDate: args.startDate,
      endDate: args.endDate,
      gradeDeadline: args.gradeDeadline,
      isActive: args.startDate <= now && now < args.endDate,
      createdAt: now,
    });

    return bimesterId;
  },
});

/**
 * Update a bimester
 */
export const updateBimester = mutation({
  args: {
    bimesterId: v.id("bimesters"),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    gradeDeadline: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const existingBimester = await ctx.db.get(args.bimesterId);
    if (!existingBimester) {
      throw new Error("Bimester not found");
    }

    const newStartDate = args.startDate ?? existingBimester.startDate;
    const newEndDate = args.endDate ?? existingBimester.endDate;
    const newGradeDeadline =
      args.gradeDeadline ?? existingBimester.gradeDeadline;

    // Validate dates
    if (newStartDate >= newEndDate) {
      throw new Error("Start date must be before end date");
    }

    if (newGradeDeadline < newEndDate) {
      throw new Error("Grade deadline must be after or equal to end date");
    }

    // Check for overlapping bimesters (excluding current one)
    const allBimesters = await ctx.db.query("bimesters").collect();
    const hasOverlap = allBimesters.some((b) => {
      if (b._id === args.bimesterId) return false;
      return (
        (newStartDate >= b.startDate && newStartDate < b.endDate) ||
        (newEndDate > b.startDate && newEndDate <= b.endDate) ||
        (newStartDate <= b.startDate && newEndDate >= b.endDate)
      );
    });

    if (hasOverlap) {
      throw new Error("This bimester overlaps with an existing one");
    }

    const now = Date.now();

    await ctx.db.patch(args.bimesterId, {
      startDate: newStartDate,
      endDate: newEndDate,
      gradeDeadline: newGradeDeadline,
      updatedAt: now,
    });

    return args.bimesterId;
  },
});

/**
 * Set a bimester as active (deprecated - status is now computed automatically)
 * This mutation is kept for backwards compatibility but doesn't do anything
 */
export const setActiveBimester = mutation({
  args: {
    bimesterId: v.id("bimesters"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const bimester = await ctx.db.get(args.bimesterId);
    if (!bimester) {
      throw new Error("Bimester not found");
    }

    // Active status is now computed automatically based on dates
    // No need to update anything
    return args.bimesterId;
  },
});

/**
 * Delete a bimester
 */
export const deleteBimester = mutation({
  args: {
    bimesterId: v.id("bimesters"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const bimester = await ctx.db.get(args.bimesterId);
    if (!bimester) {
      throw new Error("Bimester not found");
    }

    // Check if there are any classes associated with this bimester
    const classes = await ctx.db
      .query("classes")
      .withIndex("by_bimester_status_active", (q) =>
        q.eq("bimesterId", args.bimesterId),
      )
      .collect();

    if (classes.length > 0) {
      throw new Error(
        "Cannot delete bimester with associated classes. Please delete or reassign the classes first.",
      );
    }

    await ctx.db.delete(args.bimesterId);

    return args.bimesterId;
  },
});

/**
 * Check if grades can be submitted for a bimester
 */
export const canSubmitGrades = query({
  args: {
    bimesterId: v.id("bimesters"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return false;
    }

    const bimester = await ctx.db.get(args.bimesterId);
    if (!bimester) {
      return false;
    }

    const now = Date.now();
    return now <= bimester.gradeDeadline;
  },
});

/**
 * Auto-activate bimester based on current date (deprecated)
 * Active status is now computed automatically, no need for cron jobs
 */
export const autoActivateBimester = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const allBimesters = await ctx.db.query("bimesters").collect();

    const currentBimester = allBimesters.find(
      (b) => b.startDate <= now && now < b.endDate,
    );

    if (!currentBimester) {
      return {
        message: "No bimester found for current date",
        activated: false,
      };
    }

    return {
      message: "Active status is computed automatically based on dates",
      activated: true,
      bimesterId: currentBimester._id,
    };
  },
});

/**
 * Manually trigger bimester auto-activation
 * Returns the current active bimester based on date computation
 */
export const triggerAutoActivation = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const now = Date.now();
    const allBimesters = await ctx.db.query("bimesters").collect();

    const currentBimester = allBimesters.find(
      (b) => b.startDate <= now && now < b.endDate,
    );

    if (!currentBimester) {
      return {
        message: "No bimester found for current date",
        activated: false,
      };
    }

    return {
      message: "Current bimester is active (status computed automatically)",
      activated: true,
      bimesterId: currentBimester._id,
    };
  },
});
