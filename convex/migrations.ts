import { Migrations } from "@convex-dev/migrations";
import { components } from "./_generated/api.js";
import { DataModel } from "./_generated/dataModel.js";
import { internal } from "./_generated/api.js";

export const migrations = new Migrations<DataModel>(components.migrations);

// General runner for CLI
export const run = migrations.runner();

/**
 * Migration: Convert course category from "general" to "dmp"
 * STATUS: COMPLETED on 2025-12-04 (dev: 8 documents migrated)
 *
 * This migration updates all courses that have category "general" to use the new "dmp" category.
 */
export const migrateCoursesCategoryGeneralToDmp = migrations.define({
    table: "courses",
    migrateOne: async (ctx, doc) => {
        // Type assertion needed since schema now expects "dmp" but data has "general"
        const category = doc.category as string;
        if (category === "general") {
            return { category: "dmp" as const };
        }
    },
});

/**
 * Migration: Convert program_courses category from "general" to "dmp"
 * STATUS: COMPLETED on 2025-12-04 (dev: 15 documents migrated)
 *
 * This migration updates all program_courses that have category/categoryOverride "general" to "dmp".
 */
export const migrateProgramCoursesCategoryGeneralToDmp = migrations.define({
    table: "program_courses",
    migrateOne: async (ctx, doc) => {
        // Also check categoryOverride
        const categoryOverride = doc.categoryOverride as string | undefined;
        if (categoryOverride === "general") {
            return { categoryOverride: "dmp" as const };
        }
    },
});

/**
 * Run all category migrations in order
 */
export const runAllCategoryMigrations = migrations.runner([
    internal.migrations.migrateCoursesCategoryGeneralToDmp,
    internal.migrations.migrateProgramCoursesCategoryGeneralToDmp,
]);
