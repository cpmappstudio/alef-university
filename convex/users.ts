import type { UserJSON } from "@clerk/backend";
import { action, mutation, query, internalMutation } from "./_generated/server";
import type { ActionCtx, MutationCtx } from "./_generated/server";
import { api } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { ConvexError, v, type Validator } from "convex/values";
import type { UserRole } from "./types";
import { roleValidator } from "./types";

const ROLE_VALUES: UserRole[] = ["student", "professor", "admin", "superadmin"];

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
  },
  handler: async (ctx, args) => {
    return await upsertUserRecord(ctx, args);
  },
});

export const deleteUser = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, { isActive: false });
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

    await ctx.db.patch(existing._id, { isActive: false });
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
};

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

  const existingByClerkId = await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q) => q.eq("clerkId", payload.clerkId))
    .first();

  if (existingByClerkId) {
    await ctx.db.patch(existingByClerkId._id, {
      ...sharedFields,
      ...(payload.role ? { role: payload.role } : {}),
      ...(payload.isActive !== undefined ? { isActive: payload.isActive } : {}),
    });
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

    await ctx.db.patch(existingByEmail._id, {
      clerkId: payload.clerkId,
      ...sharedFields,
      ...(payload.role
        ? { role: payload.role }
        : { role: existingByEmail.role }),
      ...(payload.isActive !== undefined ? { isActive: payload.isActive } : {}),
    });
    return existingByEmail._id;
  }

  const userId = await ctx.db.insert("users", {
    clerkId: payload.clerkId,
    role: payload.role ?? "student",
    isActive: payload.isActive ?? true,
    ...sharedFields,
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
