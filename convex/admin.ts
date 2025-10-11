// ################################################################################
// # File: admin.ts                                                              # 
// # Authors: Juan Camilo Narváez Tascón (github.com/ulvenforst)                  #
// # Creation date: 08/23/2025                                                    #
// # License: Apache License 2.0                                                  #
// ################################################################################

/**
 * Administrative functions for system management
 * Handles user administration, program management, period management, and system analytics
 */

import { query, mutation, action } from "./_generated/server";
import { api } from "./_generated/api"
import type { ActionCtx } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import type { Id } from "./_generated/dataModel";
import { addressValidator } from "./types";
import {
    getUserByClerkId,
    getActiveStudentsCount,
    getActiveProfessorsCount,
    getActiveCoursesCount,
    getActiveProgramsCount,
    calculateLetterGrade,
    calculateGradePoints,
    calculateQualityPoints
} from "./helpers";
import { roleValidator, periodStatusValidator, academicStandingValidator, enrollmentStatusValidator } from "./types";

/**
 * Get all users with filtering options (Admin only)
 */
export const getAllUsers = query({
    args: {
        role: v.optional(roleValidator),
        isActive: v.optional(v.boolean()),
        searchTerm: v.optional(v.string()),
        programId: v.optional(v.id("programs")), // For filtering students by program
        studentStatus: v.optional(v.string()), // New filter for student status
        limit: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            // Return empty array instead of throwing error
            return [];
        }

        const currentUser = await getUserByClerkId(ctx.db, identity.subject);
        if (!currentUser || (currentUser.role !== "admin" && currentUser.role !== "superadmin")) {
            // Return empty array instead of throwing error
            return [];
        }

        // Base query
        let users: Doc<"users">[];

        // Apply filters
        if (args.role) {
            users = await ctx.db.query("users")
                .withIndex("by_role_active", q => q.eq("role", args.role!))
                .collect();
        } else {
            users = await ctx.db.query("users").collect();
        }

        // Apply post-query filters
        if (args.isActive !== undefined) {
            users = users.filter(user => user.isActive === args.isActive);
        }

        // Apply post-query filters that don't use an index
        if (args.programId) {
            users = users.filter(user => user.role === "student" && user.studentProfile?.programId === args.programId);
        }
        if (args.studentStatus) {
            users = users.filter(user => user.role === "student" && user.studentProfile?.status === args.studentStatus);
        }

        // Apply search term filter
        if (args.searchTerm) {
            const searchLower = args.searchTerm.toLowerCase();
            users = users.filter(user =>
                user.firstName.toLowerCase().includes(searchLower) ||
                user.lastName.toLowerCase().includes(searchLower) ||
                user.email.toLowerCase().includes(searchLower) ||
                (user.studentProfile?.studentCode?.toLowerCase().includes(searchLower))
            );
        }

        if (args.limit) {
            users = users.slice(0, args.limit);
        }

        // Get additional info for each user
        return Promise.all(
            users.map(async (user) => {
                if (user.role === "student" && user.studentProfile) {
                    const program = await ctx.db.get(user.studentProfile.programId);
                    return {
                        ...user,
                        programName: program?.nameEs ?? "N/A"
                    };
                }
                return user;
            })
        );
    },
});

/**
 * Create new academic period (Admin only)
 */
export const createPeriod = mutation({
    args: {
        code: v.string(),
        year: v.number(),
        bimesterNumber: v.number(),
        nameEs: v.string(),
        nameEn: v.optional(v.string()),
        startDate: v.number(),
        endDate: v.number(),
        enrollmentStart: v.number(),
        enrollmentEnd: v.number(),
        addDropDeadline: v.optional(v.number()),
        withdrawalDeadline: v.optional(v.number()),
        gradingStart: v.optional(v.number()),
        gradingDeadline: v.number(),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new ConvexError("Not authenticated");
        }

        const currentUser = await getUserByClerkId(ctx.db, identity.subject);
        if (!currentUser || (currentUser.role !== "admin" && currentUser.role !== "superadmin")) {
            throw new ConvexError("Admin access required");
        }

        // Validate bimester number (1-6)
        if (args.bimesterNumber < 1 || args.bimesterNumber > 6) {
            throw new ConvexError("Bimester number must be between 1 and 6");
        }

        // Check for duplicate period code
        const existingPeriod = await ctx.db
            .query("periods")
            .filter(q => q.eq(q.field("code"), args.code))
            .first();

        if (existingPeriod) {
            throw new ConvexError("Period code already exists");
        }

        // Create period
        const periodId = await ctx.db.insert("periods", {
            ...args,
            status: "planning",
            isCurrentPeriod: false,
            createdAt: Date.now(),
        });

        return periodId;
    },
});

/**
 * Update period status and dates (Admin only)
 */
export const updatePeriodStatus = mutation({
    args: {
        periodId: v.id("periods"),
        status: periodStatusValidator,
        isCurrentPeriod: v.optional(v.boolean()),
        enrollmentStart: v.optional(v.number()),
        enrollmentEnd: v.optional(v.number()),
        gradingStart: v.optional(v.number()),
        gradingDeadline: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new ConvexError("Not authenticated");
        }

        const currentUser = await getUserByClerkId(ctx.db, identity.subject);
        if (!currentUser || (currentUser.role !== "admin" && currentUser.role !== "superadmin")) {
            throw new ConvexError("Admin access required");
        }

        const period = await ctx.db.get(args.periodId);
        if (!period) {
            throw new ConvexError("Period not found");
        }

        // If marking as current period, unmark others first
        if (args.isCurrentPeriod) {
            const currentPeriods = await ctx.db
                .query("periods")
                .withIndex("by_current", q => q.eq("isCurrentPeriod", true))
                .collect();

            for (const p of currentPeriods) {
                await ctx.db.patch(p._id, { isCurrentPeriod: false });
            }
        }

        // Update period
        const updateData: any = {
            status: args.status,
            updatedAt: Date.now(),
        };

        if (args.isCurrentPeriod !== undefined) {
            updateData.isCurrentPeriod = args.isCurrentPeriod;
        }
        if (args.enrollmentStart !== undefined) {
            updateData.enrollmentStart = args.enrollmentStart;
        }
        if (args.enrollmentEnd !== undefined) {
            updateData.enrollmentEnd = args.enrollmentEnd;
        }
        if (args.gradingStart !== undefined) {
            updateData.gradingStart = args.gradingStart;
        }
        if (args.gradingDeadline !== undefined) {
            updateData.gradingDeadline = args.gradingDeadline;
        }

        await ctx.db.patch(args.periodId, updateData);

        return args.periodId;
    },
});

/**
 * Update student's academic standing (Admin only)
 */
export const updateStudentStanding = mutation({
    args: {
        studentId: v.id("users"),
        academicStanding: academicStandingValidator,
        reason: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new ConvexError("Not authenticated");
        }

        const currentUser = await getUserByClerkId(ctx.db, identity.subject);
        if (!currentUser || (currentUser.role !== "admin" && currentUser.role !== "superadmin")) {
            throw new ConvexError("Admin access required");
        }

        const student = await ctx.db.get(args.studentId);
        if (!student || student.role !== "student" || !student.studentProfile) {
            throw new ConvexError("Student not found or invalid role");
        }

        // Update student's academic standing
        await ctx.db.patch(args.studentId, {
            studentProfile: {
                ...student.studentProfile,
                academicStanding: args.academicStanding,
            },
            updatedAt: Date.now(),
        });

        // TODO: Log the academic standing change for audit trail
        // This could be added to a separate audit log table

        return args.studentId;
    },
});

/**
 * Get comprehensive system statistics (Admin only)
 */
export const getSystemStatistics = query({
    args: {
        periodId: v.optional(v.id("periods")),
        includeHistorical: v.optional(v.boolean()),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new ConvexError("Not authenticated");
        }

        const currentUser = await getUserByClerkId(ctx.db, identity.subject);
        if (!currentUser || (currentUser.role !== "admin" && currentUser.role !== "superadmin")) {
            throw new ConvexError("Admin access required");
        }

        // Get basic counts
        const [activeStudents, activeProfessors, activeCourses, activePrograms] =
            await Promise.all([
                getActiveStudentsCount(ctx.db),
                getActiveProfessorsCount(ctx.db),
                getActiveCoursesCount(ctx.db),
                getActiveProgramsCount(ctx.db),
            ]);

        // Get period-specific data
        const targetPeriod = args.periodId
            ? await ctx.db.get(args.periodId)
            : await ctx.db.query("periods")
                .withIndex("by_current", q => q.eq("isCurrentPeriod", true))
                .first();

        let periodStats = null;
        if (targetPeriod) {
            const enrollments = await ctx.db
                .query("enrollments")
                .filter(q => q.eq(q.field("periodId"), targetPeriod._id))
                .collect();

            const sections = await ctx.db
                .query("sections")
                .filter(q => q.eq(q.field("periodId"), targetPeriod._id))
                .collect();

            periodStats = {
                period: targetPeriod,
                totalEnrollments: enrollments.length,
                activeEnrollments: enrollments.filter(e => e.status === "enrolled").length,
                completedEnrollments: enrollments.filter(e => e.status === "completed").length,
                totalSections: sections.length,
                activeSections: sections.filter(s => s.status === "active").length,
                gradedSections: sections.filter(s => s.gradesSubmitted).length,
            };
        }

        // Get user registration trends (last 6 months)
        const sixMonthsAgo = Date.now() - (6 * 30 * 24 * 60 * 60 * 1000);
        const recentUsers = await ctx.db
            .query("users")
            .filter(q => q.gte(q.field("createdAt"), sixMonthsAgo))
            .collect();

        // Group users by month
        const usersByMonth = recentUsers.reduce((acc, user) => {
            const date = new Date(user.createdAt);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

            if (!acc[monthKey]) {
                acc[monthKey] = { students: 0, professors: 0, total: 0 };
            }

            acc[monthKey].total++;
            if (user.role === "student") acc[monthKey].students++;
            if (user.role === "professor") acc[monthKey].professors++;

            return acc;
        }, {} as Record<string, { students: number; professors: number; total: number }>);

        // Get pending activations
        const pendingUsers = await ctx.db
            .query("users")
            .filter(q => q.eq(q.field("isActive"), false))
            .collect();

        return {
            userCounts: {
                activeStudents,
                activeProfessors,
                totalUsers: activeStudents + activeProfessors,
                pendingActivations: pendingUsers.length,
            },
            academicCounts: {
                activePrograms,
                activeCourses,
            },
            periodStats,
            trends: {
                usersByMonth: Object.entries(usersByMonth)
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([month, counts]) => ({ month, ...counts })),
            },
            pendingActions: {
                userActivations: pendingUsers.length,
                gradeSubmissions: periodStats ?
                    periodStats.totalSections - periodStats.gradedSections : 0,
            },
        };
    },
});

/**
 * Get pending administrative actions (Admin only)
 */
export const getPendingActions = query({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new ConvexError("Not authenticated");
        }

        const currentUser = await getUserByClerkId(ctx.db, identity.subject);
        if (!currentUser || (currentUser.role !== "admin" && currentUser.role !== "superadmin")) {
            throw new ConvexError("Admin access required");
        }

        // Get inactive users needing activation
        const inactiveUsers = await ctx.db
            .query("users")
            .filter(q => q.eq(q.field("isActive"), false))
            .collect();

        // Get current period
        const currentPeriod = await ctx.db
            .query("periods")
            .withIndex("by_current", q => q.eq("isCurrentPeriod", true))
            .first();

        // Get sections needing grade submission
        let sectionsNeedingGrades: any[] = [];
        if (currentPeriod) {
            const sections = await ctx.db
                .query("sections")
                .filter(q => q.eq(q.field("periodId"), currentPeriod._id))
                .filter(q => q.eq(q.field("gradesSubmitted"), false))
                .collect();

            sectionsNeedingGrades = await Promise.all(
                sections.map(async (section) => {
                    const [course, professor] = await Promise.all([
                        ctx.db.get(section.courseId),
                        ctx.db.get(section.professorId),
                    ]);

                    return { section, course, professor };
                })
            );
        }

        // Get document requests pending processing
        const pendingDocuments = await ctx.db
            .query("document_logs")
            .filter(q => q.eq(q.field("status"), "pending"))
            .collect();

        return {
            userActivations: inactiveUsers.map(user => ({
                user,
                daysSinceRegistration: Math.floor(
                    (Date.now() - user.createdAt) / (24 * 60 * 60 * 1000)
                ),
            })),
            gradeSubmissions: sectionsNeedingGrades,
            documentRequests: pendingDocuments,
            summary: {
                totalPendingUsers: inactiveUsers.length,
                totalPendingGrades: sectionsNeedingGrades.length,
                totalPendingDocuments: pendingDocuments.length,
            },
        };
    },
});

/**
 * Force enrollment (Admin only) - For administrative purposes
 */
export const forceEnrollStudent = mutation({
    args: {
        studentId: v.id("users"),
        sectionId: v.id("sections"),
        bypassPrerequisites: v.optional(v.boolean()),
        bypassCapacity: v.optional(v.boolean()),
        reason: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new ConvexError("Not authenticated");
        }

        const currentUser = await getUserByClerkId(ctx.db, identity.subject);
        if (!currentUser || (currentUser.role !== "admin" && currentUser.role !== "superadmin")) {
            throw new ConvexError("Admin access required");
        }

        const student = await ctx.db.get(args.studentId);
        if (!student || student.role !== "student") {
            throw new ConvexError("Student not found or invalid role");
        }

        const section = await ctx.db.get(args.sectionId);
        if (!section) {
            throw new ConvexError("Section not found");
        }

        // Check for existing enrollment
        const existingEnrollment = await ctx.db
            .query("enrollments")
            .withIndex("by_student_section", q =>
                q.eq("studentId", args.studentId).eq("sectionId", args.sectionId))
            .first();

        if (existingEnrollment) {
            throw new ConvexError("Student is already enrolled in this section");
        }

        // Check capacity unless bypass is requested
        if (!args.bypassCapacity && section.enrolled >= section.capacity) {
            throw new ConvexError("Section is at capacity and bypass not requested");
        }

        // Create enrollment
        const enrollmentId = await ctx.db.insert("enrollments", {
            studentId: args.studentId,
            sectionId: args.sectionId,
            periodId: section.periodId,
            courseId: section.courseId,
            professorId: section.professorId,
            enrolledAt: Date.now(),
            enrolledBy: currentUser._id,
            status: "enrolled",
            isRetake: false,
            isAuditing: false,
            countsForGPA: true,
            countsForProgress: true,
            createdAt: Date.now(),
        });

        // Update section enrollment count if not bypassing capacity
        if (!args.bypassCapacity) {
            await ctx.db.patch(args.sectionId, {
                enrolled: section.enrolled + 1,
                updatedAt: Date.now(),
            });
        }

        return {
            enrollmentId,
            message: "Student force enrolled successfully",
            warnings: [
                ...(args.bypassPrerequisites ? ["Prerequisites bypassed"] : []),
                ...(args.bypassCapacity ? ["Capacity limit bypassed"] : []),
            ],
        };
    },
});

/**
 * Get enrollment statistics by program and period (Admin only)
 */
export const getEnrollmentStatistics = query({
    args: {
        periodId: v.optional(v.id("periods")),
        programId: v.optional(v.id("programs")),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new ConvexError("Not authenticated");
        }

        const currentUser = await getUserByClerkId(ctx.db, identity.subject);
        if (!currentUser || (currentUser.role !== "admin" && currentUser.role !== "superadmin")) {
            throw new ConvexError("Admin access required");
        }

        // Get target period
        const targetPeriod = args.periodId
            ? await ctx.db.get(args.periodId)
            : await ctx.db.query("periods")
                .withIndex("by_current", q => q.eq("isCurrentPeriod", true))
                .first();

        if (!targetPeriod) {
            throw new ConvexError("Period not found");
        }

        // Get enrollments for the period
        const enrollments = await ctx.db
            .query("enrollments")
            .filter(q => q.eq(q.field("periodId"), targetPeriod._id))
            .collect();

        // Group statistics by program if not filtering by specific program
        const statsByProgram = new Map();

        for (const enrollment of enrollments) {
            const student = await ctx.db.get(enrollment.studentId);
            if (!student?.studentProfile) continue;

            // Skip if filtering by program and this doesn't match
            if (args.programId && student.studentProfile.programId !== args.programId) {
                continue;
            }

            const programId = student.studentProfile.programId;

            if (!statsByProgram.has(programId)) {
                const program = await ctx.db.get(programId);
                statsByProgram.set(programId, {
                    program,
                    enrolled: 0,
                    completed: 0,
                    withdrawn: 0,
                    failed: 0,
                    inProgress: 0,
                });
            }

            const stats = statsByProgram.get(programId);
            switch (enrollment.status) {
                case "enrolled":
                case "in_progress":
                    stats.inProgress++;
                    break;
                case "completed":
                    stats.completed++;
                    break;
                case "withdrawn":
                case "dropped":
                    stats.withdrawn++;
                    break;
                case "failed":
                    stats.failed++;
                    break;
            }
            stats.enrolled++;
        }

        const statistics = Array.from(statsByProgram.values());

        return {
            period: targetPeriod,
            statistics,
            summary: {
                totalEnrollments: enrollments.length,
                totalPrograms: statistics.length,
                totalCompleted: statistics.reduce((sum, s) => sum + s.completed, 0),
                totalWithdrawn: statistics.reduce((sum, s) => sum + s.withdrawn, 0),
                totalFailed: statistics.reduce((sum, s) => sum + s.failed, 0),
            },
        };
    },
});

// -------------------------------------- Enrollment management for admin interface --------------------------------------

/**
 * Get all enrollments with rich data for the admin table
 */
export const getAdminEnrollments = query({
    args: {
        studentId: v.optional(v.id("users")),
        courseId: v.optional(v.id("courses")),
        sectionId: v.optional(v.id("sections")),
        periodId: v.optional(v.id("periods")),
        status: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            return [];
        }

        const user = await getUserByClerkId(ctx.db, identity.subject);
        if (!user || (user.role !== "admin" && user.role !== "superadmin")) {
            throw new ConvexError("Admin access required");
        }

        // Start with the base query, applying index first if studentId is provided
        let enrollments;
        if (args.studentId) {
            enrollments = await ctx.db
                .query("enrollments")
                .withIndex("by_student_period", q => q.eq("studentId", args.studentId!))
                .collect();
        } else {
            enrollments = await ctx.db.query("enrollments").collect();
        }

        // Apply additional filters in memory
        if (args.courseId) {
            enrollments = enrollments.filter(e => e.courseId === args.courseId);
        }
        if (args.sectionId) {
            enrollments = enrollments.filter(e => e.sectionId === args.sectionId);
        }
        if (args.periodId) {
            enrollments = enrollments.filter(e => e.periodId === args.periodId);
        }
        if (args.status) {
            enrollments = enrollments.filter(e => e.status === args.status);
        }

        // Enrich enrollments with related data
        const enrollmentsWithDetails = await Promise.all(
            enrollments.map(async (enrollment) => {
                const [student, course, section, period, professor] = await Promise.all([
                    ctx.db.get(enrollment.studentId),
                    ctx.db.get(enrollment.courseId),
                    ctx.db.get(enrollment.sectionId),
                    ctx.db.get(enrollment.periodId),
                    ctx.db.get(enrollment.professorId),
                ]);

                return {
                    ...enrollment,
                    studentName: student ? `${student.firstName} ${student.lastName}` : "N/A",
                    studentEmail: student?.email || "N/A", // Add this for frontend filtering
                    courseName: course ? course.nameEs : "N/A",
                    courseCode: course?.code || "N/A",
                    sectionInfo: section ? { groupNumber: section.groupNumber } : {},
                    periodInfo: period ? { nameEs: period.nameEs, code: period.code } : {},
                    professorName: professor ? `${professor.firstName} ${professor.lastName}` : "N/A",
                };
            })
        );

        return enrollmentsWithDetails;
    },
});


/**
 * Create a new enrollment record (Admin only)
 */
export const createEnrollment = mutation({
    args: {
        // Required fields
        studentId: v.id("users"),
        sectionId: v.id("sections"),
        periodId: v.id("periods"),
        courseId: v.id("courses"),
        professorId: v.optional(v.id("users")),
        status: enrollmentStatusValidator,

        // Optional fields
        statusChangeReason: v.optional(v.string()),
        percentageGrade: v.optional(v.number()),
        letterGrade: v.optional(v.string()),
        gradePoints: v.optional(v.number()),
        gradeNotes: v.optional(v.string()),
        isRetake: v.optional(v.boolean()),
        isAuditing: v.optional(v.boolean()),
        countsForGPA: v.optional(v.boolean()),
        countsForProgress: v.optional(v.boolean()),
        incompleteDeadline: v.optional(v.number()),
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

        // Validate that the section exists
        const section = await ctx.db.get(args.sectionId);
        if (!section) {
            throw new ConvexError("Section not found");
        }

        // Validate that the course exists
        const course = await ctx.db.get(args.courseId);
        if (!course) {
            throw new ConvexError("Course not found");
        }

        // Calculate grade-related fields if percentage grade is provided
        let letterGrade = args.letterGrade;
        let gradePoints = args.gradePoints;
        let qualityPoints = undefined;

        if (args.percentageGrade !== undefined) {
            letterGrade = letterGrade || calculateLetterGrade(args.percentageGrade);
            gradePoints = gradePoints || calculateGradePoints(args.percentageGrade);
            qualityPoints = calculateQualityPoints(gradePoints, course.credits);
        }

        // Create enrollment record
        const enrollmentId = await ctx.db.insert("enrollments", {
            studentId: args.studentId,
            sectionId: args.sectionId,
            periodId: args.periodId,
            courseId: args.courseId,
            professorId: args.professorId || section.professorId,
            enrolledAt: Date.now(),
            enrolledBy: user._id,
            status: args.status,
            statusChangedAt: Date.now(),
            statusChangedBy: user._id,
            statusChangeReason: args.statusChangeReason,
            percentageGrade: args.percentageGrade,
            letterGrade,
            gradePoints,
            qualityPoints,
            gradedBy: args.percentageGrade !== undefined ? user._id : undefined,
            gradedAt: args.percentageGrade !== undefined ? Date.now() : undefined,
            gradeNotes: args.gradeNotes,
            lastGradeUpdate: args.percentageGrade !== undefined ? Date.now() : undefined,
            isRetake: args.isRetake ?? false,
            isAuditing: args.isAuditing ?? false,
            countsForGPA: args.countsForGPA ?? !args.isAuditing,
            countsForProgress: args.countsForProgress ?? !args.isAuditing,
            incompleteDeadline: args.incompleteDeadline,
            createdAt: Date.now(),
        });

        // Update section enrollment count
        await ctx.db.patch(args.sectionId, {
            enrolled: section.enrolled + 1,
        });

        return enrollmentId;
    }
});

/**
 * Update an existing enrollment record (Admin only)
 */
export const updateEnrollment = mutation({
    args: {
        enrollmentId: v.id("enrollments"),
        status: v.optional(enrollmentStatusValidator),
        statusChangeReason: v.optional(v.string()),
        percentageGrade: v.optional(v.number()),
        letterGrade: v.optional(v.string()),
        gradePoints: v.optional(v.number()),
        gradeNotes: v.optional(v.string()),
        isRetake: v.optional(v.boolean()),
        isAuditing: v.optional(v.boolean()),
        countsForGPA: v.optional(v.boolean()),
        countsForProgress: v.optional(v.boolean()),
        incompleteDeadline: v.optional(v.number()),
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

        const { enrollmentId, ...updates } = args;
        const enrollment = await ctx.db.get(enrollmentId);
        if (!enrollment) throw new ConvexError("Enrollment not found");

        const course = await ctx.db.get(enrollment.courseId);
        if (!course) throw new ConvexError("Course not found");

        // Build update object
        const updatePayload: any = {
            updatedAt: Date.now()
        };

        // Update status-related fields
        if (updates.status !== undefined) {
            updatePayload.status = updates.status;
            updatePayload.statusChangedAt = Date.now();
            updatePayload.statusChangedBy = user._id;
        }
        if (updates.statusChangeReason !== undefined) {
            updatePayload.statusChangeReason = updates.statusChangeReason;
        }

        // Update grade-related fields
        if (updates.percentageGrade !== undefined) {
            updatePayload.percentageGrade = updates.percentageGrade;
            updatePayload.letterGrade = updates.letterGrade || calculateLetterGrade(updates.percentageGrade);
            updatePayload.gradePoints = updates.gradePoints || calculateGradePoints(updates.percentageGrade);
            updatePayload.qualityPoints = calculateQualityPoints(updatePayload.gradePoints, course.credits);
            updatePayload.gradedAt = Date.now();
            updatePayload.gradedBy = user._id;
            updatePayload.lastGradeUpdate = Date.now();
        } else {
            // Update letter grade and grade points independently if provided
            if (updates.letterGrade !== undefined) {
                updatePayload.letterGrade = updates.letterGrade;
            }
            if (updates.gradePoints !== undefined) {
                updatePayload.gradePoints = updates.gradePoints;
                updatePayload.qualityPoints = calculateQualityPoints(updates.gradePoints, course.credits);
            }
        }

        if (updates.gradeNotes !== undefined) {
            updatePayload.gradeNotes = updates.gradeNotes;
        }

        // Update enrollment settings
        if (updates.isRetake !== undefined) {
            updatePayload.isRetake = updates.isRetake;
        }
        if (updates.isAuditing !== undefined) {
            updatePayload.isAuditing = updates.isAuditing;
        }
        if (updates.countsForGPA !== undefined) {
            updatePayload.countsForGPA = updates.countsForGPA;
        }
        if (updates.countsForProgress !== undefined) {
            updatePayload.countsForProgress = updates.countsForProgress;
        }
        if (updates.incompleteDeadline !== undefined) {
            updatePayload.incompleteDeadline = updates.incompleteDeadline;
        }

        await ctx.db.patch(enrollmentId, updatePayload);
        return enrollmentId;
    }
});


/**
 * Delete an enrollment record (Admin only)
 */
export const deleteEnrollment = mutation({
    args: {
        enrollmentId: v.id("enrollments"),
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

        const enrollment = await ctx.db.get(args.enrollmentId);
        if (!enrollment) {
            throw new ConvexError("Enrollment not found");
        }

        // Decrement the enrolled count on the section
        const section = await ctx.db.get(enrollment.sectionId);
        if (section) {
            await ctx.db.patch(section._id, {
                enrolled: Math.max(0, section.enrolled - 1),
            });
        }

        await ctx.db.delete(args.enrollmentId);
        return { success: true };
    }
});

// -------------------------------------- Period management for admin interface --------------------------------------

/**
 * Get all academic periods with filtering (Admin only)
 */
export const getAllPeriods = query({
    args: {
        year: v.optional(v.number()),
        status: v.optional(periodStatusValidator),
        searchTerm: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            return [];
        }

        const currentUser = await getUserByClerkId(ctx.db, identity.subject);
        if (!currentUser || (currentUser.role !== "admin" && currentUser.role !== "superadmin")) {
            throw new ConvexError("Admin access required");
        }

        let periods = await ctx.db.query("periods").collect();

        // Apply filters
        if (args.year) {
            periods = periods.filter(p => p.year === args.year);
        }
        if (args.status) {
            periods = periods.filter(p => p.status === args.status);
        }
        if (args.searchTerm) {
            const searchLower = args.searchTerm.toLowerCase();
            periods = periods.filter(p =>
                p.code.toLowerCase().includes(searchLower) ||
                p.nameEs.toLowerCase().includes(searchLower)
            );
        }

        // Sort by year and bimester number descending
        return periods.sort((a, b) => {
            if (a.year !== b.year) {
                return b.year - a.year;
            }
            return b.bimesterNumber - a.bimesterNumber;
        });
    },
});

/**
 * Comprehensive update for an academic period (Admin only)
 */
export const updatePeriod = mutation({
    args: {
        periodId: v.id("periods"),
        nameEs: v.string(),
        nameEn: v.optional(v.string()),
        startDate: v.number(),
        endDate: v.number(),
        enrollmentStart: v.number(),
        enrollmentEnd: v.number(),
        addDropDeadline: v.optional(v.number()),
        withdrawalDeadline: v.optional(v.number()),
        gradingStart: v.optional(v.number()),
        gradingDeadline: v.number(),
        status: periodStatusValidator,
        isCurrentPeriod: v.boolean(),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new ConvexError("Not authenticated");
        }
        const currentUser = await getUserByClerkId(ctx.db, identity.subject);
        if (!currentUser || (currentUser.role !== "admin" && currentUser.role !== "superadmin")) {
            throw new ConvexError("Admin access required");
        }

        const { periodId, ...rest } = args;

        // If marking as current period, ensure no others are marked as such
        if (args.isCurrentPeriod) {
            const currentPeriods = await ctx.db
                .query("periods")
                .withIndex("by_current", q => q.eq("isCurrentPeriod", true))
                .filter(q => q.neq(q.field("_id"), periodId))
                .collect();

            for (const p of currentPeriods) {
                await ctx.db.patch(p._id, { isCurrentPeriod: false });
            }
        }

        await ctx.db.patch(periodId, { ...rest, updatedAt: Date.now() });
        return periodId;
    },
});

/**
 * Delete a period (Admin only)
 */
export const deletePeriod = mutation({
    args: { periodId: v.id("periods") },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new ConvexError("Not authenticated");
        const user = await getUserByClerkId(ctx.db, identity.subject);
        if (!user || (user.role !== "admin" && user.role !== "superadmin")) {
            throw new ConvexError("Admin access required");
        }

        // Prevent deletion if sections exist for this period
        const sections = await ctx.db
            .query("sections")
            .withIndex("by_period_status_active", q => q.eq("periodId", args.periodId))
            .first();

        if (sections) {
            throw new ConvexError("Cannot delete a period with associated sections. Please delete sections first.");
        }

        await ctx.db.delete(args.periodId);
        return { success: true };
    },
});

// -------------------------------------- Professor management for admin interface ----------------------------------------

/**
 * Update a professor's profile (Admin only)
 */
export const adminUpdateProfessor = mutation({
    args: {
        professorId: v.id("users"),
        firstName: v.string(),
        lastName: v.string(),
        isActive: v.boolean(),
        // Profile fields
        title: v.optional(v.string()),
        department: v.optional(v.string()),
        // Add other fields from the form
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new ConvexError("Not authenticated");
        const user = await getUserByClerkId(ctx.db, identity.subject);
        if (!user || (user.role !== "admin" && user.role !== "superadmin")) {
            throw new ConvexError("Admin access required");
        }

        const { professorId, ...rest } = args;
        const professor = await ctx.db.get(professorId);
        if (!professor || professor.role !== 'professor') throw new ConvexError("Professor not found");

        await ctx.db.patch(professorId, {
            firstName: rest.firstName,
            lastName: rest.lastName,
            isActive: rest.isActive,
            professorProfile: {
                employeeCode: professor.professorProfile?.employeeCode || "",
                ...professor.professorProfile,
                title: rest.title,
                department: rest.department,
            },
            updatedAt: Date.now()
        });
        return professorId;
    },
});

/**
 * Get a professor's teaching history (all sections ever taught)
 */
export const getProfessorTeachingHistory = query({
    args: { professorId: v.id("users") },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new ConvexError("Not authenticated");
        const user = await getUserByClerkId(ctx.db, identity.subject);
        if (!user || (user.role !== "admin" && user.role !== "superadmin")) {
            throw new ConvexError("Admin access required");
        }

        const sections = await ctx.db
            .query("sections")
            .withIndex("by_professor_period", q => q.eq("professorId", args.professorId))
            .collect();

        return Promise.all(
            sections.map(async (section) => {
                const [course, period] = await Promise.all([
                    ctx.db.get(section.courseId),
                    ctx.db.get(section.periodId)
                ]);
                return {
                    ...section,
                    courseCode: course?.code,
                    courseName: course?.nameEs,
                    periodName: period?.nameEs,
                }
            })
        );
    }
});


// -------------------------------------- Section management for admin interface ----------------------------------------

/**
 * Get all sections with rich data and advanced filtering for the admin table.
 */
export const adminGetSections = query({
    args: {
        courseId: v.optional(v.id("courses")),
        periodId: v.optional(v.id("periods")),
        professorId: v.optional(v.id("users")),
        deliveryMethod: v.optional(v.string()),
        status: v.optional(v.string()),
        isActive: v.optional(v.boolean()),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            return [];
        }
        const user = await getUserByClerkId(ctx.db, identity.subject);
        if (!user || (user.role !== "admin" && user.role !== "superadmin")) {
            throw new ConvexError("Admin access required");
        }

        let sections;

        // Use the most efficient index based on available arguments
        if (args.courseId) {
            sections = await ctx.db
                .query("sections")
                .withIndex("by_course_period", q => q.eq("courseId", args.courseId!))
                .collect();
        } else if (args.professorId) {
            sections = await ctx.db
                .query("sections")
                .withIndex("by_professor_period", q => q.eq("professorId", args.professorId!))
                .collect();
        } else {
            sections = await ctx.db.query("sections").collect();
        }

        // Apply additional filters in memory
        if (args.periodId) {
            sections = sections.filter(section => section.periodId === args.periodId);
        }
        if (args.deliveryMethod) {
            sections = sections.filter(section => section.deliveryMethod === args.deliveryMethod);
        }
        if (args.status) {
            sections = sections.filter(section => section.status === args.status);
        }
        if (args.isActive !== undefined) {
            sections = sections.filter(section => section.isActive === args.isActive);
        }

        // Enhance section data with related document details
        const sectionsWithDetails = await Promise.all(
            sections.map(async (section) => {
                const [course, professor, period] = await Promise.all([
                    ctx.db.get(section.courseId),
                    ctx.db.get(section.professorId),
                    ctx.db.get(section.periodId)
                ]);

                return {
                    ...section,
                    courseName: course ? `${course.code} - ${course.nameEs}` : "N/A",
                    courseCode: course?.code,
                    professorName: professor ? `${professor.firstName} ${professor.lastName}` : "TBD",
                    periodName: period?.nameEs
                };
            })
        );

        return sectionsWithDetails;
    },
});

/**
 * Update a student's profile information (Admin only)
 */
export const adminUpdateStudent = mutation({
    args: {
        // Required fields
        studentId: v.id("users"),
        firstName: v.string(),
        lastName: v.string(),
        isActive: v.boolean(),
        programId: v.id("programs"),
        enrollmentDate: v.number(),
        status: v.union(v.literal("active"), v.literal("inactive"), v.literal("on_leave"), v.literal("graduated"), v.literal("withdrawn")),
        academicStanding: v.union(v.literal("good_standing"), v.literal("probation"), v.literal("suspension")),

        // Optional fields
        dateOfBirth: v.optional(v.number()),
        nationality: v.optional(v.string()),
        documentType: v.optional(v.union(v.literal("passport"), v.literal("national_id"), v.literal("driver_license"), v.literal("other"))),
        documentNumber: v.optional(v.string()),
        phone: v.optional(v.string()),
        country: v.optional(v.string()),
        address: v.optional(v.object({
            street: v.string(),
            city: v.string(),
            state: v.string(),
            zipCode: v.string(),
            country: v.string(),
        })),
        expectedGraduationDate: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new ConvexError("Not authenticated");
        const user = await getUserByClerkId(ctx.db, identity.subject);
        if (!user || (user.role !== "admin" && user.role !== "superadmin")) {
            throw new ConvexError("Admin access required");
        }

        const { studentId, ...updates } = args;
        const student = await ctx.db.get(studentId);
        if (!student || student.role !== 'student') throw new ConvexError("Student not found");

        // Build the update object with all fields
        const updateObject = {
            firstName: updates.firstName,
            lastName: updates.lastName,
            isActive: updates.isActive,
            dateOfBirth: student.dateOfBirth,
            nationality: student.nationality,
            documentType: student.documentType,
            documentNumber: student.documentNumber,
            phone: student.phone,
            country: student.country,
            address: student.address,
            studentProfile: student.studentProfile,
            updatedAt: Date.now()
        };

        // Add optional personal fields
        if (updates.dateOfBirth !== undefined) updateObject.dateOfBirth = updates.dateOfBirth;
        if (updates.nationality !== undefined) updateObject.nationality = updates.nationality;
        if (updates.documentType !== undefined) updateObject.documentType = updates.documentType;
        if (updates.documentNumber !== undefined) updateObject.documentNumber = updates.documentNumber;
        if (updates.phone !== undefined) updateObject.phone = updates.phone;
        if (updates.country !== undefined) updateObject.country = updates.country;
        if (updates.address !== undefined) updateObject.address = updates.address;

        // Build student profile
        updateObject.studentProfile = {
            ...student.studentProfile, // Preserve existing fields
            studentCode: student.studentProfile?.studentCode || "",
            programId: updates.programId,
            enrollmentDate: updates.enrollmentDate,
            status: updates.status,
            academicStanding: updates.academicStanding,
        };

        // Add optional student profile fields
        if (updates.expectedGraduationDate !== undefined) {
            updateObject.studentProfile.expectedGraduationDate = updates.expectedGraduationDate;
        }

        await ctx.db.patch(studentId, updateObject);
        return studentId;
    },
});

/**
 * Create a new user in Clerk and sync with Convex
 * This is called by admins when creating students/professors
 */
export const createUserWithClerk = action({
    args: {
        email: v.string(),
        firstName: v.string(),
        lastName: v.string(),
        role: v.union(
            v.literal("student"),
            v.literal("professor"),
            v.literal("admin")
        ),

        // **THE FIX**: Add all the optional personal fields from the form.
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
        address: v.optional(addressValidator), // Use the existing addressValidator

        // Student-specific profile (no changes needed here)
        studentProfile: v.optional(v.object({
            studentCode: v.string(),
            programId: v.id("programs"),
            enrollmentDate: v.number(),
            status: v.union(
                v.literal("active"),
                v.literal("inactive"),
                v.literal("on_leave"),
                v.literal("graduated"),
                v.literal("withdrawn")
            ),
        })),

        // Professor-specific profile (no changes needed here)
        professorProfile: v.optional(v.object({
            employeeCode: v.string(),
            title: v.optional(v.string()),
            department: v.optional(v.string()),
            hireDate: v.optional(v.number()),
        })),
    },
    handler: async (
        ctx: ActionCtx,
        args: any
    ): Promise<{ success: boolean; message: string; }> => {
        const clerkAPIKey = process.env.CLERK_SECRET_KEY;
        if (!clerkAPIKey) {
            throw new Error("CLERK_SECRET_KEY environment variable is not set.");
        }

        const appUrl = process.env.APP_URL || "https://www.alefsru.com";

        // **STEP 1: CREATE INVITATION WITH FIRST/LAST NAME IN PUBLIC METADATA**
        const invitationResponse = await fetch("https://api.clerk.com/v1/invitations", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${clerkAPIKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                email_address: args.email,
                public_metadata: {
                    role: args.role,
                    firstName: args.firstName,
                    lastName: args.lastName,
                },
                redirect_url: `${appUrl}/sign-up`,
                ignore_existing: true,
            }),
        });

        if (!invitationResponse.ok) {
            const errorBody = await invitationResponse.text();
            throw new Error(`Failed to create Clerk invitation: ${errorBody}`);
        }

        // **STEP 2: CREATE PENDING USER IN CONVEX**
        const pendingClerkId = `pending_${args.email}_${Date.now()}`;

        const userId = await ctx.runMutation(api.auth.createOrUpdateUser, {
            clerkId: pendingClerkId,
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
        });

        // **STEP 3: ADD ROLE-SPECIFIC PROFILE**
        if (args.studentProfile || args.professorProfile) {
            await ctx.runMutation(api.auth.updateUserRole, {
                userId,
                role: args.role,
                isActive: false,
                studentProfile: args.studentProfile,
                professorProfile: args.professorProfile,
            });
        }

        return {
            success: true,
            message: "Invitation sent successfully. User will be activated after accepting the invitation.",
        };
    },
});
