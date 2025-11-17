/* THIS NEED REFACTORING */

import type { UserJSON } from "@clerk/backend";
import { action, mutation, query, internalMutation } from "./_generated/server";
import type { ActionCtx, MutationCtx } from "./_generated/server";
import { api } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { ConvexError, v, type Validator } from "convex/values";
import type { UserRole } from "./types";
import { roleValidator } from "./types";

const ROLE_VALUES: UserRole[] = ["student", "professor", "admin", "superadmin"];
type StudentProfilePayload = {
  studentCode: string;
  programId: Id<"programs">;
};

type UserDocument = Doc<"users">;

/** ------------------------------------------------------------------
 * Basic queries
 * ------------------------------------------------------------------ */

export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    return await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();
  },
});

export const getUserRole = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();

    return user?.role ?? null;
  },
});

export const getUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.userId);
  },
});

export const getUserByClerkId = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();
  },
});

export const getAllUsers = query({
  args: {
    role: v.optional(roleValidator),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    let users = await ctx.db.query("users").collect();

    if (args.role) {
      users = users.filter((user) => user.role === args.role);
    }

    if (args.isActive !== undefined) {
      users = users.filter((user) => user.isActive === args.isActive);
    }

    return users;
  },
});

export const checkEmailExists = query({
  args: {
    email: v.string(),
    excludeUserId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (!user) {
      return false;
    }

    if (args.excludeUserId && user._id === args.excludeUserId) {
      return false;
    }

    return true;
  },
});

/** ------------------------------------------------------------------
 * Actions for Clerk-managed operations
 * ------------------------------------------------------------------ */

export const createProfessorWithClerk = action({
  args: {
    firstName: v.string(),
    lastName: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    country: v.optional(v.string()),
    isActive: v.boolean(),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{ userId: Id<"users">; clerkId: string }> => {
    await requireAdminForAction(ctx);
    await ensureEmailAvailable(ctx, args.email);

    const clerkAPIKey = process.env.CLERK_SECRET_KEY;
    if (!clerkAPIKey) {
      throw new ConvexError(
        "CLERK_SECRET_KEY environment variable is not set.",
      );
    }

    const response = await fetch("https://api.clerk.com/v1/users", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${clerkAPIKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email_address: [args.email],
        first_name: args.firstName,
        last_name: args.lastName,
        public_metadata: { role: "professor" },
        skip_password_checks: true,
        skip_password_requirement: true,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new ConvexError(`Failed to create Clerk user: ${errorBody}`);
    }

    const clerkUser = (await response.json()) as UserJSON;
    const email =
      extractPrimaryEmail(clerkUser) ??
      args.email ??
      clerkUser.email_addresses?.[0]?.email_address ??
      "";

    const userId = await ctx.runMutation(api.users.upsertUser, {
      clerkId: clerkUser.id,
      email,
      firstName: args.firstName,
      lastName: args.lastName,
      role: "professor",
      phone: args.phone,
      country: args.country,
      isActive: args.isActive,
    });

    return { userId, clerkId: clerkUser.id };
  },
});

export const updateProfessorWithClerk = action({
  args: {
    clerkId: v.string(),
    firstName: v.string(),
    lastName: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    country: v.optional(v.string()),
    isActive: v.boolean(),
  },
  handler: async (ctx, args): Promise<{ clerkId: string }> => {
    await requireAdminForAction(ctx);

    const clerkAPIKey = process.env.CLERK_SECRET_KEY;
    if (!clerkAPIKey) {
      throw new ConvexError(
        "CLERK_SECRET_KEY environment variable is not set.",
      );
    }

    const response = await fetch(
      `https://api.clerk.com/v1/users/${args.clerkId}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${clerkAPIKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          first_name: args.firstName,
          last_name: args.lastName,
        }),
      },
    );

    if (!response.ok) {
      const errorBody = await response.text();
      throw new ConvexError(`Failed to update Clerk user: ${errorBody}`);
    }

    await ctx.runMutation(api.users.upsertUser, {
      clerkId: args.clerkId,
      email: args.email,
      firstName: args.firstName,
      lastName: args.lastName,
      role: "professor",
      phone: args.phone,
      country: args.country,
      isActive: args.isActive,
    });

    return { clerkId: args.clerkId };
  },
});

export const deleteUserWithClerk = action({
  args: {
    userId: v.id("users"),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{ userId: Id<"users">; clerkId: string | null }> => {
    await requireAdminForAction(ctx);

    const user = await ctx.runQuery(api.users.getUser, {
      userId: args.userId,
    });

    if (!user) {
      throw new ConvexError("User not found");
    }

    const clerkId = user.clerkId ?? null;

    if (clerkId) {
      const clerkAPIKey = process.env.CLERK_SECRET_KEY;
      if (!clerkAPIKey) {
        throw new ConvexError(
          "CLERK_SECRET_KEY environment variable is not set.",
        );
      }

      const response = await fetch(
        `https://api.clerk.com/v1/users/${clerkId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${clerkAPIKey}`,
          },
        },
      );

      if (!response.ok && response.status !== 404) {
        const errorBody = await response.text();
        throw new ConvexError(`Failed to delete Clerk user: ${errorBody}`);
      }
    }

    await ctx.runMutation(api.users.deleteUser, {
      userId: args.userId,
    });

    return { userId: args.userId, clerkId };
  },
});

/** ------------------------------------------------------------------
 * Mutations used within Convex
 * ------------------------------------------------------------------ */

export const upsertUser = mutation({
  args: {
    clerkId: v.string(),
    email: v.string(),
    firstName: v.string(),
    lastName: v.string(),
    role: v.optional(roleValidator),
    dateOfBirth: v.optional(v.number()),
    nationality: v.optional(v.string()),
    documentType: v.optional(
      v.union(
        v.literal("passport"),
        v.literal("national_id"),
        v.literal("driver_license"),
        v.literal("other"),
      ),
    ),
    documentNumber: v.optional(v.string()),
    phone: v.optional(v.string()),
    country: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
    studentProfile: v.optional(
      v.object({
        studentCode: v.string(),
        programId: v.id("programs"),
      }),
    ),
  },
  handler: async (ctx, args) => {
    return await upsertUserRecord(ctx, args);
  },
});

/**
 * Delete a user from the database with cascade delete for related records.
 *
 * Cascade delete removes:
 * - All class_enrollments (student grades and enrollment records)
 *
 * @param userId - The Convex ID of the user to delete
 * @returns The deleted user's ID
 */
export const deleteUser = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    // Cascade delete: Remove all class enrollments (grades) for this student
    const classEnrollments = await ctx.db
      .query("class_enrollments")
      .withIndex("by_student", (q) => q.eq("studentId", args.userId))
      .collect();

    for (const enrollment of classEnrollments) {
      await ctx.db.delete(enrollment._id);
    }

    // Delete the user
    await ctx.db.delete(args.userId);
    return args.userId;
  },
});

/** ------------------------------------------------------------------
 * Internal mutations for Clerk webhooks
 * ------------------------------------------------------------------ */

export const upsertFromClerk = internalMutation({
  args: { data: v.any() as Validator<UserJSON> },
  handler: async (ctx, { data }) => {
    const payload = buildPayloadFromClerk(data);
    if (!payload) {
      console.warn(
        `[users:upsertFromClerk] Missing email for Clerk user ${data.id}, skipping sync.`,
      );
      return null;
    }
    return await upsertUserRecord(ctx, payload);
  },
});

export const deleteFromClerk = internalMutation({
  args: { clerkUserId: v.string() },
  handler: async (ctx, { clerkUserId }) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkUserId))
      .first();

    if (!existing) {
      console.warn(`No Convex user linked to Clerk user ${clerkUserId}`);
      return null;
    }

    await ctx.db.delete(existing._id);
    return existing._id;
  },
});

/** ------------------------------------------------------------------
 * Shared helper used by webhook and local mutations
 * ------------------------------------------------------------------ */

export type UserUpsertPayload = {
  clerkId: string;
  email: string;
  firstName: string;
  lastName: string;
  role?: UserRole | null;
  dateOfBirth?: number;
  nationality?: string;
  documentType?: UserDocument["documentType"];
  documentNumber?: string;
  phone?: string;
  country?: string;
  isActive?: boolean;
  studentProfile?: StudentProfilePayload;
};

/**
 * Helper function to filter out undefined values from an object.
 * This prevents undefined values from overwriting existing data during patch operations.
 */
function filterUndefinedValues<T extends Record<string, any>>(
  obj: T,
): Partial<T> {
  const result: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      result[key] = value;
    }
  }
  return result;
}

/**
 * Helper function to ensure optional string fields are created as empty strings
 * instead of being omitted from the document during insert operations.
 */
function normalizeFieldsForInsert(fields: SharedFields): SharedFields {
  return {
    ...fields,
    phone: fields.phone ?? "",
    country: fields.country ?? "",
  };
}

export async function upsertUserRecord(
  ctx: MutationCtx,
  payload: UserUpsertPayload,
): Promise<Id<"users">> {
  const email = payload.email?.trim();
  if (!email) {
    throw new ConvexError("Email is required to sync user records");
  }

  const sharedFields = buildSharedFields({
    ...payload,
    email,
  });
  const studentProfileUpdate = sanitizeStudentProfile(payload.studentProfile);

  const existingByClerkId = await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q) => q.eq("clerkId", payload.clerkId))
    .first();

  if (existingByClerkId) {
    // Filter undefined values to prevent overwriting existing fields with undefined
    await ctx.db.patch(
      existingByClerkId._id,
      filterUndefinedValues({
        ...sharedFields,
        ...studentProfileUpdate,
        ...(payload.role ? { role: payload.role } : {}),
        ...(payload.isActive !== undefined
          ? { isActive: payload.isActive }
          : {}),
      }),
    );
    return existingByClerkId._id;
  }

  const existingByEmail = await ctx.db
    .query("users")
    .withIndex("by_email", (q) => q.eq("email", email))
    .first();

  if (existingByEmail) {
    if (
      existingByEmail.clerkId &&
      existingByEmail.clerkId !== payload.clerkId
    ) {
      throw new ConvexError("Email address already exists");
    }

    // Filter undefined values to prevent overwriting existing fields with undefined
    await ctx.db.patch(
      existingByEmail._id,
      filterUndefinedValues({
        clerkId: payload.clerkId,
        ...sharedFields,
        ...studentProfileUpdate,
        ...(payload.role
          ? { role: payload.role }
          : { role: existingByEmail.role }),
        ...(payload.isActive !== undefined
          ? { isActive: payload.isActive }
          : {}),
      }),
    );
    return existingByEmail._id;
  }

  // For inserts, normalize fields to ensure optional fields are created as empty strings
  const normalizedFields = normalizeFieldsForInsert(sharedFields);
  const userId = await ctx.db.insert("users", {
    clerkId: payload.clerkId,
    role: payload.role ?? "student",
    isActive: payload.isActive ?? true,
    ...normalizedFields,
    ...studentProfileUpdate,
  });

  return userId;
}

type SharedFields = Pick<
  UserDocument,
  | "email"
  | "firstName"
  | "lastName"
  | "dateOfBirth"
  | "nationality"
  | "documentType"
  | "documentNumber"
  | "phone"
  | "country"
>;

function buildSharedFields(
  payload: UserUpsertPayload & { email: string },
): SharedFields {
  return {
    email: payload.email,
    firstName: payload.firstName ?? "",
    lastName: payload.lastName ?? "",
    dateOfBirth: payload.dateOfBirth,
    nationality: payload.nationality,
    documentType: payload.documentType,
    documentNumber: payload.documentNumber,
    phone: payload.phone,
    country: payload.country,
  };
}

function sanitizeStudentProfile(
  profile?: StudentProfilePayload,
): Partial<Pick<UserDocument, "studentProfile">> {
  if (!profile) {
    return {};
  }

  return {
    studentProfile: {
      studentCode: profile.studentCode,
      programId: profile.programId,
    },
  };
}

function buildPayloadFromClerk(data: UserJSON): UserUpsertPayload | null {
  const email = extractPrimaryEmail(data);
  if (!email) {
    return null;
  }

  return {
    clerkId: data.id,
    email,
    firstName: data.first_name ?? "",
    lastName: data.last_name ?? "",
    role: extractRoleFromMetadata(data.public_metadata),
    isActive: true,
  };
}

/**
 * Check if a student code already exists
 */
export const checkStudentCodeExists = query({
  args: {
    studentCode: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .filter((q) =>
        q.and(
          q.eq(q.field("role"), "student"),
          q.eq(q.field("studentProfile.studentCode"), args.studentCode),
        ),
      )
      .first();

    return !!existing;
  },
});

export const createStudentWithClerk = action({
  args: {
    firstName: v.string(),
    lastName: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    country: v.optional(v.string()),
    dateOfBirth: v.optional(v.number()),
    nationality: v.optional(v.string()),
    documentType: v.optional(
      v.union(
        v.literal("passport"),
        v.literal("national_id"),
        v.literal("driver_license"),
        v.literal("other"),
      ),
    ),
    documentNumber: v.optional(v.string()),
    studentProfile: v.object({
      studentCode: v.string(),
      programId: v.id("programs"),
    }),
    isActive: v.boolean(),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{ userId: Id<"users">; clerkId: string }> => {
    await requireAdminForAction(ctx);
    await ensureEmailAvailable(ctx, args.email);

    // Check if student code already exists
    const studentCodeExists = await ctx.runQuery(
      api.users.checkStudentCodeExists,
      { studentCode: args.studentProfile.studentCode },
    );
    if (studentCodeExists) {
      throw new ConvexError(
        `Student code "${args.studentProfile.studentCode}" already exists`,
      );
    }

    const clerkAPIKey = process.env.CLERK_SECRET_KEY;
    if (!clerkAPIKey) {
      throw new ConvexError(
        "CLERK_SECRET_KEY environment variable is not set.",
      );
    }

    const response = await fetch("https://api.clerk.com/v1/users", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${clerkAPIKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email_address: [args.email],
        first_name: args.firstName,
        last_name: args.lastName,
        public_metadata: {
          role: "student",
          studentCode: args.studentProfile.studentCode,
        },
        skip_password_checks: true,
        skip_password_requirement: true,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new ConvexError(`Failed to create Clerk user: ${errorBody}`);
    }

    const clerkUser = (await response.json()) as UserJSON;
    const email =
      extractPrimaryEmail(clerkUser) ??
      args.email ??
      clerkUser.email_addresses?.[0]?.email_address ??
      "";

    const userId = (await ctx.runMutation(api.users.upsertUser, {
      clerkId: clerkUser.id,
      email,
      firstName: args.firstName,
      lastName: args.lastName,
      role: "student",
      phone: args.phone,
      country: args.country,
      dateOfBirth: args.dateOfBirth,
      nationality: args.nationality,
      documentType: args.documentType,
      documentNumber: args.documentNumber,
      studentProfile: args.studentProfile,
      isActive: args.isActive,
    })) as Id<"users">;

    return { userId, clerkId: clerkUser.id };
  },
});

export const updateStudentWithClerk = action({
  args: {
    clerkId: v.string(),
    firstName: v.string(),
    lastName: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    country: v.optional(v.string()),
    dateOfBirth: v.optional(v.number()),
    nationality: v.optional(v.string()),
    documentType: v.optional(
      v.union(
        v.literal("passport"),
        v.literal("national_id"),
        v.literal("driver_license"),
        v.literal("other"),
      ),
    ),
    documentNumber: v.optional(v.string()),
    studentProfile: v.object({
      studentCode: v.string(),
      programId: v.id("programs"),
    }),
    isActive: v.boolean(),
  },
  handler: async (ctx, args): Promise<{ clerkId: string }> => {
    await requireAdminForAction(ctx);

    const clerkAPIKey = process.env.CLERK_SECRET_KEY;
    if (!clerkAPIKey) {
      throw new ConvexError(
        "CLERK_SECRET_KEY environment variable is not set.",
      );
    }

    const response = await fetch(
      `https://api.clerk.com/v1/users/${args.clerkId}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${clerkAPIKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          first_name: args.firstName,
          last_name: args.lastName,
        }),
      },
    );

    if (!response.ok) {
      const errorBody = await response.text();
      throw new ConvexError(`Failed to update Clerk user: ${errorBody}`);
    }

    await ctx.runMutation(api.users.upsertUser, {
      clerkId: args.clerkId,
      email: args.email,
      firstName: args.firstName,
      lastName: args.lastName,
      role: "student",
      phone: args.phone,
      country: args.country,
      dateOfBirth: args.dateOfBirth,
      nationality: args.nationality,
      documentType: args.documentType,
      documentNumber: args.documentNumber,
      studentProfile: args.studentProfile,
      isActive: args.isActive,
    });

    return { clerkId: args.clerkId };
  },
});

function extractPrimaryEmail(data: UserJSON): string | null {
  const primaryId = data.primary_email_address_id;
  const addresses = data.email_addresses ?? [];
  const primary = addresses.find(
    (emailAddress) => emailAddress.id === primaryId,
  );
  return primary?.email_address ?? addresses[0]?.email_address ?? null;
}

function extractRoleFromMetadata(
  metadata: UserJSON["public_metadata"],
): UserRole | undefined {
  if (!metadata || typeof metadata !== "object") {
    return undefined;
  }
  const maybeRole = (metadata as Record<string, unknown>).role;
  if (
    typeof maybeRole === "string" &&
    ROLE_VALUES.includes(maybeRole as UserRole)
  ) {
    return maybeRole as UserRole;
  }
  return undefined;
}

async function requireAdminForAction(ctx: ActionCtx) {
  const currentUser = await ctx.runQuery(api.users.getCurrentUser, {});
  if (
    !currentUser ||
    (currentUser.role !== "admin" && currentUser.role !== "superadmin")
  ) {
    throw new ConvexError("Admin access required");
  }
  return currentUser;
}

async function ensureEmailAvailable(ctx: ActionCtx, email: string) {
  const exists = await ctx.runQuery(api.users.checkEmailExists, {
    email,
  });
  if (exists) {
    throw new ConvexError("Email address already exists");
  }
}
