// ################################################################################
// # File: seed.ts                                                               #
// # Description: Seeds the database with initial data for Alef University.       #
// # To run: Go to the Convex dashboard, select this function, and run it.        #
// ################################################################################

import { internalAction, internalMutation } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { v, ConvexError } from "convex/values";

/**
 * Helper mutation to delete a specific user by ID
 */
export const deleteUserById = internalMutation({
    args: {
        userId: v.id("users"),
    },
    handler: async (ctx, args) => {
        await ctx.db.delete(args.userId);
    },
});

/**
 * Clean/Revert the database before seeding
 * WARNING: This will delete ALL data from the specified tables
 */
export const revertSeed = internalAction({
  args: {},
  handler: async (ctx) => {
    console.log("🧹 Starting database cleanup process...");

    try {
      // Delete in reverse order of dependencies
      console.log("Deleting enrollments...");
      await ctx.runMutation(internal.seed.deleteAllFromTable, { table: "enrollments" });

      console.log("Deleting sections...");
      await ctx.runMutation(internal.seed.deleteAllFromTable, { table: "sections" });

      console.log("Deleting program_courses associations...");
      await ctx.runMutation(internal.seed.deleteAllFromTable, { table: "program_courses" });

      console.log("Deleting courses...");
      await ctx.runMutation(internal.seed.deleteAllFromTable, { table: "courses" });

      console.log("Deleting periods...");
      await ctx.runMutation(internal.seed.deleteAllFromTable, { table: "periods" });

      console.log("Deleting programs...");
      await ctx.runMutation(internal.seed.deleteAllFromTable, { table: "programs" });

      console.log("Deleting users...");
      await ctx.runMutation(internal.seed.deleteAllFromTable, { table: "users" });

      console.log("✅ Database cleanup completed successfully!");
      return { success: true, message: "All seed data has been removed" };
    } catch (error: any) {
      console.error("❌ Error during cleanup:", error.message);
      throw new ConvexError(`Cleanup failed: ${error.message}`);
    }
  },
});

/**
 * Internal mutation helper to delete all documents from a table
 */
export const deleteAllFromTable = internalMutation({
  args: {
    table: v.string(),
  },
  handler: async (ctx, args) => {
    const tableName = args.table as any;
    const documents = await ctx.db.query(tableName).collect();
    
    let count = 0;
    for (const doc of documents) {
      await ctx.db.delete(doc._id);
      count++;
    }
    
    console.log(`  Deleted ${count} documents from ${args.table}`);
    return count;
  },
});

/**
 * Seed the database with initial data
 * Optionally clean existing data first
 */
export const seedDatabase = internalAction({
  args: {
    cleanFirst: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    console.log("🚀 Starting database seeding process...");

    // Clean existing data if requested
    if (args.cleanFirst) {
      console.log("Cleaning existing data first...");
      await ctx.runAction(internal.seed.revertSeed, {});
    }

    // --- 1. Create a Professor ---
    console.log("Creating professor...");
    const professorId = await ctx.runMutation(internal.auth.internalCreateOrUpdateUser, {
        clerkId: `pending_professor_${Date.now()}`,
        email: "professor.aleft@gmail.com",
        firstName: "Juan",
        lastName: "Camilo",
        role: "professor",
    });

    await ctx.runMutation(internal.auth.internalUpdateUserRoleUnsafe, {
        userId: professorId,
        role: "professor",
        isActive: true,
        professorProfile: {
            employeeCode: "PROF-001",
            title: "Dr.",
            department: "Theology",
            hireDate: Date.now(),
        }
    });
    console.log(`✅ Professor created with ID: ${professorId}`);

    // --- 2. Create the Academic Program ---
    console.log("Creating academic program...");
    const programId = await ctx.runMutation(internal.programs.internalCreateProgram, {
      code: "14M",
      nameEs: "Maestría en Pensamiento Cristiano",
      descriptionEs: "Programa de maestría enfocado en el estudio profundo del pensamiento cristiano a lo largo de la historia.",
      type: "master",
      language: "es",
      totalCredits: 40,
      durationBimesters: 6,
    });
    console.log(`✅ Program created with ID: ${programId}`);

    // --- 3. Create Courses and associate with the Program ---
    console.log("Creating courses...");
    const coursesData = [
      { code: "MTHPR-01", name: "Métodos y técnicas de investigación", credits: 3 },
      { code: "MTHBI-02", name: "Crítica bíblica", credits: 3 },
      { code: "MTHHI-03", name: "Historia de la Iglesia", credits: 3 },
      { code: "MTHSI-04", name: "Teología sistemática", credits: 3 },
      { code: "MTHPR-05", name: "Oratoria sagrada", credits: 3 },
      { code: "MTHSI-07", name: "Teología en el pensamiento humano", credits: 3 },
      { code: "MTHSI-08", name: "Cristo y salvación", credits: 3 },
      { code: "MTHHI-09", name: "Teología patrística y medieval", credits: 3 },
      { code: "MTHSI-10", name: "Teología contemporánea", credits: 3 },
      { code: "MTHHI-11", name: "Historia del pensamiento latinoamericano", credits: 3 },
      { code: "MTHHI-12", name: "Pensamiento cristiano y la Iglesia del s XXI", credits: 3 },
      { code: "MTHEX-18", name: "Exégesis Bíblica", credits: 3 },
      { code: "CHMA-15", name: "Introducción al mundo académico", credits: 2 },
      { code: "THSI-22", name: "Teología católica romana", credits: 3 },
      { code: "THSI-23", name: "Teología protestante y corrientes denominacionales", credits: 3 },
      { code: "MTHSI-11", name: "Nuevas teologías de la liberación", credits: 3 },
      { code: "THSI-26", name: "Inculturación de la teología", credits: 3 },
      { code: "THHI-06", name: "Padres de la Iglesia", credits: 3 },
    ];

    const courseIds = [];
    for (const course of coursesData) {
      const courseId = await ctx.runMutation(internal.courses.internalCreateCourse, {
        code: course.code,
        nameEs: course.name,
        descriptionEs: `Curso de ${course.name}`,
        credits: course.credits,
        language: "es",
        category: "core",
        prerequisites: [],
      });
      await ctx.runMutation(internal.courses.internalAddCourseToProgram, {
        courseId: courseId,
        programId: programId,
        isRequired: true,
      });
      courseIds.push(courseId);
      console.log(`  - Course '${course.name}' created.`);
    }
    console.log(`✅ ${courseIds.length} courses created and associated with the program.`);

    // --- 4. Create an Academic Period ---
    console.log("Creating academic period...");
    const now = new Date();
    const year = now.getFullYear();
    const periodId = await ctx.runMutation(internal.admin.internalCreatePeriod, {
        code: `${year}-B5`,
        year: year,
        bimesterNumber: 5,
        nameEs: `Quinto Bimestre ${year}`,
        startDate: now.getTime(),
        endDate: now.getTime() + (60 * 24 * 60 * 60 * 1000),
        enrollmentStart: now.getTime() - (7 * 24 * 60 * 60 * 1000),
        enrollmentEnd: now.getTime() + (7 * 24 * 60 * 60 * 1000),
        gradingDeadline: now.getTime() + (65 * 24 * 60 * 60 * 1000),
    });
    await ctx.runMutation(internal.admin.internalUpdatePeriodStatus, {
        periodId: periodId,
        status: "enrollment",
        isCurrentPeriod: true,
    });
    console.log(`✅ Academic Period created for ${year}-B5 and set to current.`);

    // --- 5. Create Sections for Courses ---
    console.log("Creating sections for each course...");
    const sectionIds = [];
    for (const courseId of courseIds) {
        const section = await ctx.runMutation(internal.courses.internalCreateSection, {
            courseId: courseId,
            periodId: periodId,
            groupNumber: "01",
            professorId: professorId,
            capacity: 25,
            deliveryMethod: "online_async",
        });
        await ctx.runMutation(internal.courses.internalUpdateSection, {
            sectionId: section.sectionId,
            status: "open",
        });
        sectionIds.push(section.sectionId);
    }
    console.log(`✅ ${sectionIds.length} sections created and opened for enrollment.`);

    // --- 6. Create Students via Clerk Invitation ---
    console.log("Creating students and sending invitations...");
    const studentsData = [
      { firstName: "Oscar", lastName: "Lopez", email: "lopez_oscar23@hotmail.com" },
      { firstName: "Daniel", lastName: "Leshua", email: "danieljeshua97@gmail.com" },
      { firstName: "Calles", lastName: "Diaz", email: "callesdiaz83@gmail.com" },
      { firstName: "Liezer", lastName: "ZR", email: "liezerzr@hotmail.es" },
      { firstName: "Jose", lastName: "Inestroza", email: "joseinestroza.swd@gmail.com" },
      { firstName: "Carmen", lastName: "Ruiz", email: "carmen.ruiz.alicea@gmail.com" },
    ];

    const studentConvexIds = [];
    for (const [index, student] of studentsData.entries()) {
        try {
            // Use the internal action instead
            const result = await ctx.runAction(internal.admin.internalCreateUserWithClerk, {
              email: student.email,
              firstName: student.firstName,
              lastName: student.lastName,
              role: "student",
              studentProfile: {
                  studentCode: `MTH-${year}-${String(index + 1).padStart(3, '0')}`,
                  programId: programId,
                  enrollmentDate: Date.now(),
                  status: "active",
              }
            });

            studentConvexIds.push(result.userId);
            console.log(`  - Invitation sent to ${student.email}.`);
        } catch (error: any) {
            console.error(`  - Failed to invite ${student.email}: ${error.message}`);
        }
    }
    console.log(`✅ ${studentConvexIds.length} student invitations sent.`);
    
    // --- 7. Enroll Students in Sections ---
    console.log("Enrolling students in sections...");
    const sectionsToEnroll = sectionIds.slice(0, 3);
    for (const studentId of studentConvexIds) {
        for (const sectionId of sectionsToEnroll) {
            try {
                await ctx.runMutation(internal.admin.internalForceEnrollStudent, {
                    studentId,
                    sectionId,
                    reason: "Initial seed enrollment",
                });
            } catch (error: any) {
                console.warn(`Could not enroll student ${studentId} in ${sectionId}: ${error.message}`);
            }
        }
    }
    console.log(`✅ Students enrolled in initial sections.`);

    console.log("🎉 Database seeding process completed successfully!");

    return { success: true };
  },
});