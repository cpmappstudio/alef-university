// ################################################################################
// # File: auth.ts                                                                # 
// # Authors: Juan Camilo Narváez Tascón (github.com/ulvenforst)                  #
// # Creation date: 08/23/2025                                                    #
// # License: Apache License 2.0                                                  #
// ################################################################################

/**
 * Authentication and user management functions
 * Handles Clerk integration, user creation, profile updates
 */

import { query, mutation, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { v, ConvexError } from "convex/values";
import { getUserByClerkId } from "./helpers";
import { roleValidator, addressValidator } from "./types";

/**
 * Create or update user from Clerk authentication
 * Called automatically when user signs up or signs in
 */
export const createOrUpdateUser = mutation({
    args: {
        clerkId: v.string(),
        email: v.string(),
        firstName: v.string(),
        lastName: v.string(),
        role: v.optional(roleValidator),

        // **THE FIX**: Add the optional personal fields here too.
        dateOfBirth: v.optional(v.number()),
        nationality: v.optional(v.string()),
        documentType: v.optional(v.union(
            v.literal("passport"),
            v.literal("national_id"),
            v.literal("driver_license"),
            v.literal("other")
        )),
        documentNumber: v.optional(v.string()),
        phone: v.optional(v.string()),
        country: v.optional(v.string()),
        address: v.optional(addressValidator),
    },
    handler: async (ctx, args) => {
        const existingByClerkId = await ctx.db
            .query("users")
            .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
            .first();

        const existingByEmail = await ctx.db
            .query("users")
            .withIndex("by_email", (q) => q.eq("email", args.email))
            .first();

        if (existingByClerkId) {
            await ctx.db.patch(existingByClerkId._id, {
                email: args.email,
                firstName: args.firstName,
                lastName: args.lastName,
                role: args.role,
                dateOfBirth: args.dateOfBirth,
                nationality: args.nationality,
                documentType: args.documentType,
                documentNumber: args.documentNumber,
                phone: args.phone,
                country: args.country,
                address: args.address,
                updatedAt: Date.now(),
            });
            return existingByClerkId._id;
        }

        if (existingByEmail && !existingByEmail.clerkId.startsWith("pending_")) {
            throw new Error("Email address already exists");
        }

        if (existingByEmail && existingByEmail.clerkId.startsWith("pending_")) {
            return existingByEmail._id;
        }

        const userId = await ctx.db.insert("users", {
            clerkId: args.clerkId,
            email: args.email,
            firstName: args.firstName,
            lastName: args.lastName,
            role: args.role ?? "student",
            isActive: args.clerkId.startsWith("pending_") ? false : true,
            dateOfBirth: args.dateOfBirth,
            nationality: args.nationality,
            documentType: args.documentType,
            documentNumber: args.documentNumber,
            phone: args.phone,
            country: args.country,
            address: args.address,
            createdAt: Date.now(),
        });

        return userId;
    },
});

export const internalCreateOrUpdateUser = internalMutation({
    args: {
        clerkId: v.string(),
        email: v.string(),
        firstName: v.string(),
        lastName: v.string(),
        role: v.optional(roleValidator),
        dateOfBirth: v.optional(v.number()),
        nationality: v.optional(v.string()),
        documentType: v.optional(v.union(
            v.literal("passport"),
            v.literal("national_id"),
            v.literal("driver_license"),
            v.literal("other")
        )),
        documentNumber: v.optional(v.string()),
        phone: v.optional(v.string()),
        country: v.optional(v.string()),
        address: v.optional(addressValidator),
    },
    handler: async (ctx, args) => {
        const existingByClerkId = await ctx.db
            .query("users")
            .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
            .first();

        const existingByEmail = await ctx.db
            .query("users")
            .withIndex("by_email", (q) => q.eq("email", args.email))
            .first();

        if (existingByClerkId) {
            await ctx.db.patch(existingByClerkId._id, {
                email: args.email,
                firstName: args.firstName,
                lastName: args.lastName,
                role: args.role,
                dateOfBirth: args.dateOfBirth,
                nationality: args.nationality,
                documentType: args.documentType,
                documentNumber: args.documentNumber,
                phone: args.phone,
                country: args.country,
                address: args.address,
                updatedAt: Date.now(),
            });
            return existingByClerkId._id;
        }

        if (existingByEmail && !existingByEmail.clerkId.startsWith("pending_")) {
            throw new Error("Email address already exists");
        }

        if (existingByEmail && existingByEmail.clerkId.startsWith("pending_")) {
            return existingByEmail._id;
        }

        const userId = await ctx.db.insert("users", {
            clerkId: args.clerkId,
            email: args.email,
            firstName: args.firstName,
            lastName: args.lastName,
            role: args.role ?? "student",
            isActive: args.clerkId.startsWith("pending_") ? false : true,
            dateOfBirth: args.dateOfBirth,
            nationality: args.nationality,
            documentType: args.documentType,
            documentNumber: args.documentNumber,
            phone: args.phone,
            country: args.country,
            address: args.address,
            createdAt: Date.now(),
        });

        return userId;
    },
});


/**
 * Get current authenticated user with full profile
 */
export const getCurrentUser = query({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            return null;
        }

        const user = await getUserByClerkId(ctx.db, identity.subject);
        if (!user) {
            throw new ConvexError("User not found in database");
        }

        // Get additional profile data based on role
        let profileData = null;

        if (user.role === "student" && user.studentProfile) {
            // Get program information
            const program = await ctx.db.get(user.studentProfile.programId);
            profileData = {
                ...user.studentProfile,
                program: program,
            };
        } else if (user.role === "professor" && user.professorProfile) {
            profileData = user.professorProfile;
        }

        return {
            ...user,
            profileData,
        };
    },
});

/**
 * Update user personal information
 * Users can only update their own profile
 */
export const updateUserProfile = mutation({
    args: {
        phone: v.optional(v.string()),
        country: v.optional(v.string()),
        address: v.optional(addressValidator),
        dateOfBirth: v.optional(v.number()),
        nationality: v.optional(v.string()),
        documentType: v.optional(v.union(
            v.literal("passport"),
            v.literal("national_id"),
            v.literal("driver_license"),
            v.literal("other")
        )),
        documentNumber: v.optional(v.string()),
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

        // Update user profile
        await ctx.db.patch(user._id, {
            ...args,
            updatedAt: Date.now(),
        });

        return user._id;
    },
});

/**
 * Update user role and activate account (Admin only)
 */
export const updateUserRole = mutation({
    args: {
        userId: v.id("users"),
        role: roleValidator,
        isActive: v.boolean(),
        studentProfile: v.optional(v.object({
            studentCode: v.string(),
            programId: v.id("programs"),
            enrollmentDate: v.number(),
            expectedGraduationDate: v.optional(v.number()),
            status: v.union(
                v.literal("active"),
                v.literal("inactive"),
                v.literal("on_leave"),
                v.literal("graduated"),
                v.literal("withdrawn")
            ),
            academicStanding: v.optional(v.union(
                v.literal("good_standing"),
                v.literal("probation"),
                v.literal("suspension")
            )),
        })),
        professorProfile: v.optional(v.object({
            employeeCode: v.string(),
            title: v.optional(v.string()),
            department: v.optional(v.string()),
            hireDate: v.optional(v.number()),
        })),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new ConvexError("Not authenticated");
        }

        const currentUser = await getUserByClerkId(ctx.db, identity.subject);
        if (!currentUser) {
            throw new ConvexError("User not found");
        }

        // Only admin or superadmin can update roles
        if (currentUser.role !== "admin" && currentUser.role !== "superadmin") {
            throw new ConvexError("Only administrators can update user roles");
        }

        // Update user role and profile
        await ctx.db.patch(args.userId, {
            role: args.role,
            isActive: args.isActive,
            studentProfile: args.studentProfile,
            professorProfile: args.professorProfile,
            updatedAt: Date.now(),
        });

        return args.userId;
    },
});

export const internalUpdateUserRoleUnsafe = internalMutation({
    args: {
        userId: v.id("users"),
        role: roleValidator,
        isActive: v.boolean(),
        studentProfile: v.optional(v.object({
            studentCode: v.string(),
            programId: v.id("programs"),
            enrollmentDate: v.number(),
            expectedGraduationDate: v.optional(v.number()),
            status: v.union(
                v.literal("active"),
                v.literal("inactive"),
                v.literal("on_leave"),
                v.literal("graduated"),
                v.literal("withdrawn")
            ),
            academicStanding: v.optional(v.union(
                v.literal("good_standing"),
                v.literal("probation"),
                v.literal("suspension")
            )),
        })),
        professorProfile: v.optional(v.object({
            employeeCode: v.string(),
            title: v.optional(v.string()),
            department: v.optional(v.string()),
            hireDate: v.optional(v.number()),
        })),
    },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.userId, {
            role: args.role,
            isActive: args.isActive,
            studentProfile: args.studentProfile,
            professorProfile: args.professorProfile,
            updatedAt: Date.now(),
        });
        return args.userId;
    },
});

/**
 * Get user by ID (Admin only, or own profile)
 */
export const getUserById = query({
    args: {
        userId: v.id("users"),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new ConvexError("Not authenticated");
        }

        const currentUser = await getUserByClerkId(ctx.db, identity.subject);
        if (!currentUser) {
            throw new ConvexError("User not found");
        }

        // Check permissions - can view own profile or admin can view any
        if (currentUser._id !== args.userId &&
            currentUser.role !== "admin" &&
            currentUser.role !== "superadmin") {
            throw new ConvexError("Permission denied");
        }

        const user = await ctx.db.get(args.userId);
        if (!user) {
            throw new ConvexError("User not found");
        }

        return user;
    },
});

/**
 * List users with filters (Admin only)
 */
export const listUsers = query({
    args: {
        role: v.optional(roleValidator),
        isActive: v.optional(v.boolean()),
        limit: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new ConvexError("Not authenticated");
        }

        const currentUser = await getUserByClerkId(ctx.db, identity.subject);
        if (!currentUser) {
            throw new ConvexError("User not found");
        }

        // Only admin can list users
        if (currentUser.role !== "admin" && currentUser.role !== "superadmin") {
            throw new ConvexError("Only administrators can list users");
        }

        let query;

        // Apply filters
        if (args.role !== undefined && args.isActive !== undefined) {
            query = ctx.db.query("users")
                .withIndex("by_role_active", q => q.eq("role", args.role!).eq("isActive", args.isActive!));
        } else {
            query = ctx.db.query("users");
            if (args.role !== undefined) {
                query = query.filter(q => q.eq(q.field("role"), args.role));
            }
            if (args.isActive !== undefined) {
                query = query.filter(q => q.eq(q.field("isActive"), args.isActive));
            }
        }

        // Apply limit and collect
        const results = await query.collect();
        if (args.limit) {
            return results.slice(0, args.limit);
        }

        return results;
    },
});

/**
 * Deactivate user (Admin only)
 */
export const deactivateUser = mutation({
    args: {
        userId: v.id("users"),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new ConvexError("Not authenticated");
        }

        const currentUser = await getUserByClerkId(ctx.db, identity.subject);
        if (!currentUser) {
            throw new ConvexError("User not found");
        }

        // Only admin can deactivate users
        if (currentUser.role !== "admin" && currentUser.role !== "superadmin") {
            throw new ConvexError("Only administrators can deactivate users");
        }

        // Cannot deactivate self
        if (currentUser._id === args.userId) {
            throw new ConvexError("Cannot deactivate your own account");
        }

        await ctx.db.patch(args.userId, {
            isActive: false,
            updatedAt: Date.now(),
        });

        return args.userId;
    },
});

/**
 * Get user by email (for webhook processing)
 */
export const getUserByEmail = query({
    args: { email: v.string() },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("users")
            .withIndex("by_email", (q) => q.eq("email", args.email))
            .first();
    },
});

/**
 * Activate pending user with real Clerk ID
 */
export const activatePendingUser = mutation({
    args: {
        userId: v.id("users"),
        clerkId: v.string()
    },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.userId, {
            clerkId: args.clerkId,
            isActive: true,
            updatedAt: Date.now(),
            lastLoginAt: Date.now(),
        });
    },
});

/**
 * INTERNAL: Get user by email (for webhook processing)
 * This is an internal function that can be called from httpActions
 */
export const getUserByEmailInternal = internalQuery({
    args: { email: v.string() },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("users")
            .withIndex("by_email", (q) => q.eq("email", args.email))
            .first();
    },
});

/**
 * INTERNAL: Activate pending user with real Clerk ID
 * This is an internal function that can be called from httpActions
 */
export const activatePendingUserInternal = internalMutation({
    args: {
        userId: v.id("users"),
        clerkId: v.string()
    },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.userId, {
            clerkId: args.clerkId,
            isActive: true,
            updatedAt: Date.now(),
            lastLoginAt: Date.now(),
        });
    },
});

/**
 * INTERNAL: Handle Clerk webhook events
 * Called from http.ts webhook endpoint to process user events
 */
export const handleClerkWebhook = internalMutation({
    args: {
        eventType: v.string(),
        userId: v.string(),
        email: v.optional(v.string()),
        firstName: v.optional(v.string()),
        lastName: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        console.log(`Processing webhook event: ${args.eventType} for user ${args.email}`);

        switch (args.eventType) {
            case "user.created":
                // Check if user already exists by clerkId
                const existingUserByClerkId = await ctx.db
                    .query("users")
                    .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.userId))
                    .first();

                if (existingUserByClerkId) {
                    console.log(`User with clerkId ${args.userId} already exists`);
                    return existingUserByClerkId._id;
                }

                // Check if there's a pending user with this email
                const pendingUser = await ctx.db
                    .query("users")
                    .withIndex("by_email", (q) => q.eq("email", args.email || ""))
                    .first();

                if (pendingUser && pendingUser.clerkId.startsWith("pending_")) {
                    // Activate the pending user with real Clerk ID
                    console.log(`Activating pending user ${args.email}`);
                    await ctx.db.patch(pendingUser._id, {
                        clerkId: args.userId,
                        firstName: args.firstName || pendingUser.firstName,
                        lastName: args.lastName || pendingUser.lastName,
                        isActive: true,
                        updatedAt: Date.now(),
                        lastLoginAt: Date.now(),
                    });

                    // Update Clerk user with names from database
                    const clerkAPIKey = process.env.CLERK_SECRET_KEY;
                    if (clerkAPIKey) {
                        try {
                            await fetch(`https://api.clerk.com/v1/users/${args.userId}`, {
                                method: "PATCH",
                                headers: {
                                    "Authorization": `Bearer ${clerkAPIKey}`,
                                    "Content-Type": "application/json",
                                },
                                body: JSON.stringify({
                                    first_name: args.firstName || pendingUser.firstName,
                                    last_name: args.lastName || pendingUser.lastName,
                                }),
                            });
                            console.log("Updated Clerk user with names from database");
                        } catch (error) {
                            console.error("Failed to update Clerk user:", error);
                        }
                    }

                    return pendingUser._id;
                }

                // If no pending user, create new user with default student role
                console.log(`Creating new user ${args.email}`);
                const newUserId = await ctx.db.insert("users", {
                    clerkId: args.userId,
                    email: args.email || "",
                    firstName: args.firstName || "",
                    lastName: args.lastName || "",
                    role: "student", // Default role
                    isActive: false, // Needs admin to activate and assign proper role
                    createdAt: Date.now(),
                });

                return newUserId;

            case "user.updated":
                // Update user information
                const userToUpdate = await ctx.db
                    .query("users")
                    .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.userId))
                    .first();

                if (userToUpdate) {
                    console.log(`Updating user ${args.email}`);
                    await ctx.db.patch(userToUpdate._id, {
                        email: args.email || userToUpdate.email,
                        firstName: args.firstName || userToUpdate.firstName,
                        lastName: args.lastName || userToUpdate.lastName,
                        updatedAt: Date.now(),
                    });
                    return userToUpdate._id;
                }

                console.log(`User ${args.email} not found for update`);
                return null;

            default:
                console.log(`Unhandled event type: ${args.eventType}`);
                return null;
        }
    },
});