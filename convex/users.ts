import { query } from "./_generated/server";

/**
 * Get all users
 */
export const getAllUsers = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const users = await ctx.db.query("users").collect();
    return users;
  },
});
