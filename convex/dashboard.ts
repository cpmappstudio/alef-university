// convex/dashboard.ts

// ################################################################################
// # File: dashboard.ts                                                           # 
// # Authors: Juan Camilo Narváez Tascón (github.com/ulvenforst)                  #
// # Creation date: 08/23/2025                                                    #
// # License: Apache License 2.0                                                  #
// ################################################################################

/**
 * Dashboard queries for different user roles
 * Provides comprehensive data for student, professor, and admin dashboards
 */

import { query } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import {
    getUserByClerkId,
    getCurrentPeriod,
    calculateAcademicProgress,
    getActiveStudentsCount,
    getActiveProfessorsCount,
    getActiveCoursesCount,
    getActiveProgramsCount,
    calculateGPA,
    getProfessorSections,
} from "./helpers";

/**
 * Get comprehensive student dashboard data
 */
export const getStudentDashboard = query({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new ConvexError("Not authenticated");
        }

        const user = await getUserByClerkId(ctx.db, identity.subject);
        if (!user || user.role !== "student" || !user.studentProfile) {
            throw new ConvexError("Student not found or invalid role");
        }

        const currentPeriod = await getCurrentPeriod(ctx.db);
        
        const program = await ctx.db.get(user.studentProfile.programId);
        if (!program) {
            throw new ConvexError("Program not found");
        }

        const currentEnrollments = currentPeriod ? await ctx.db
            .query("enrollments")
            .withIndex("by_student_period", q =>
                q.eq("studentId", user._id).eq("periodId", currentPeriod._id))
            .collect() : [];

        const enrollmentDetails = await Promise.all(
            currentEnrollments.map(async (enrollment) => {
                const [section, course, professor] = await Promise.all([
                    ctx.db.get(enrollment.sectionId),
                    ctx.db.get(enrollment.courseId),
                    ctx.db.get(enrollment.professorId),
                ]);
                return { enrollment, section, course, professor };
            })
        );

        const academicProgress = await calculateAcademicProgress(ctx.db, user._id);
        const allEnrollments = await ctx.db
            .query("enrollments")
            .withIndex("by_student_period", q => q.eq("studentId", user._id))
            .filter(q => q.eq(q.field("countsForGPA"), true))
            .collect();

        const gpaResult = await calculateGPA(ctx.db, allEnrollments);
        const periodGpaResult = await calculateGPA(ctx.db, currentEnrollments.filter(e => e.countsForGPA));

        return {
            user: { ...user, program },
            currentPeriod,
            enrollments: enrollmentDetails,
            academicProgress,
            gpa: { cumulative: gpaResult, period: periodGpaResult },
            summary: {
                totalCreditsEnrolled: enrollmentDetails.reduce((sum, e) => sum + (e.course?.credits || 0), 0),
                completedCourses: allEnrollments.filter(e => e.status === "completed").length,
                totalCourses: allEnrollments.length,
                academicStanding: user.studentProfile.academicStanding || "good_standing",
            }
        };
    },
});

/**
 * Get comprehensive professor dashboard data
 * Provides metrics, current sections, and upcoming deadlines.
 */
export const getProfessorDashboard = query({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new ConvexError("Not authenticated");
        }

        const user = await getUserByClerkId(ctx.db, identity.subject);
        if (!user || user.role !== "professor") {
            throw new ConvexError("Professor access required");
        }

        const now = Date.now();
        const currentPeriod = await getCurrentPeriod(ctx.db);
        if (!currentPeriod) {
            return { 
                metrics: { totalSections: 0, totalStudents: 0, sectionsToGrade: 0, averageEnrollment: 0, totalCreditsTeaching: 0, periodsTaught: 0, totalStudentsTaught: 0 },
                sections: [],
                upcomingClosingDates: []
            };
        }

        // --- Data for Cards ---
        const currentSections = await getProfessorSections(ctx.db, user._id, currentPeriod._id);

        const sectionsDetails = await Promise.all(
            currentSections.map(async (section) => {
                const course = await ctx.db.get(section.courseId);
                return {
                    id: section._id,
                    courseCode: course?.code ?? "N/A",
                    courseName: course?.nameEs ?? "Unknown",
                    groupNumber: section.groupNumber,
                    credits: course?.credits ?? 0,
                    enrolledStudents: section.enrolled,
                    closingDate: new Date(currentPeriod.gradingDeadline).toISOString(),
                    category: course?.category ?? "general",
                    status: section.status,
                };
            })
        );

        const upcomingClosingDates = sectionsDetails
            .filter(s => new Date(s.closingDate).getTime() > now)
            .map(s => ({
                courseCode: s.courseCode,
                courseName: s.courseName,
                groupNumber: parseInt(s.groupNumber),
                closingDate: s.closingDate,
                daysRemaining: Math.ceil((new Date(s.closingDate).getTime() - now) / (1000 * 60 * 60 * 24)),
            }))
            .sort((a, b) => a.daysRemaining - b.daysRemaining);

        // --- Data for Metrics ---
        const allTimeSections = await ctx.db.query("sections").withIndex("by_professor_period", q => q.eq("professorId", user._id)).collect();
        const allTimeEnrollments = await ctx.db.query("enrollments").filter(q => q.eq(q.field("professorId"), user._id)).collect();
        const totalCreditsTeaching = sectionsDetails.reduce((sum, s) => sum + s.credits, 0);
        const sectionsToGrade = currentSections.filter(s => s.status === 'grading' || (s.status === 'active' && !s.gradesSubmitted)).length;
        const totalStudentsCurrent = currentSections.reduce((sum, s) => sum + s.enrolled, 0);

        return {
            metrics: {
                currentPeriod: currentPeriod.nameEs,
                totalSections: currentSections.length,
                totalStudents: totalStudentsCurrent,
                sectionsToGrade: sectionsToGrade,
                averageEnrollment: currentSections.length > 0 ? totalStudentsCurrent / currentSections.length : 0,
                totalCreditsTeaching: totalCreditsTeaching,
                periodsTaught: new Set(allTimeSections.map(s => s.periodId)).size,
                totalStudentsTaught: allTimeEnrollments.length
            },
            sections: sectionsDetails,
            upcomingClosingDates,
        };
    },
});


/**
 * Get comprehensive admin dashboard data
 * Provides metrics, upcoming deadlines, and recent activities for the admin homepage.
 */
export const getAdminDashboard = query({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new ConvexError("Not authenticated");
        const user = await getUserByClerkId(ctx.db, identity.subject);
        if (!user || (user.role !== "admin" && user.role !== "superadmin")) {
            throw new ConvexError("Admin access required");
        }

        const currentPeriod = await getCurrentPeriod(ctx.db);

        // --- 1. Metrics for AdminMetricsGrid ---
        const [
            activeProfessors,
            activeStudents,
            activeCourses,
            activePrograms,
            totalEnrollments,
            activeSections,
        ] = await Promise.all([
            getActiveProfessorsCount(ctx.db),
            getActiveStudentsCount(ctx.db),
            getActiveCoursesCount(ctx.db),
            getActiveProgramsCount(ctx.db),
            ctx.db.query("enrollments").collect().then(e => e.length),
            currentPeriod ? ctx.db.query("sections").withIndex("by_period_status_active", q => q.eq("periodId", currentPeriod._id)).collect().then(s => s.length) : 0,
        ]);
        const pendingEnrollments = await ctx.db.query("enrollments").withIndex("by_status_period", q=> q.eq("status", "enrolled")).collect();

        // --- 2. Upcoming Deadlines for UpcomingDeadlinesCard ---
        const now = Date.now();
        const upcomingPeriods = await ctx.db.query("periods").filter(q => q.gt(q.field("endDate"), now)).collect();

        const upcomingDeadlines = upcomingPeriods.flatMap(period => {
            const deadlines = [];
            if (period.enrollmentEnd > now) {
                deadlines.push({
                    id: `${period._id}-enroll`,
                    title: "Enrollment Deadline",
                    description: `For period ${period.code}`,
                    date: new Date(period.enrollmentEnd).toISOString(),
                    daysRemaining: Math.ceil((period.enrollmentEnd - now) / (1000 * 60 * 60 * 24)),
                    type: "enrollment",
                });
            }
            if (period.gradingDeadline > now) {
                deadlines.push({
                    id: `${period._id}-grade`,
                    title: "Grade Submission",
                    description: `For period ${period.code}`,
                    date: new Date(period.gradingDeadline).toISOString(),
                    daysRemaining: Math.ceil((period.gradingDeadline - now) / (1000 * 60 * 60 * 24)),
                    type: "grading",
                });
            }
            return deadlines;
        }).sort((a, b) => a.daysRemaining - b.daysRemaining).slice(0, 4);

        // --- 3. Recent Activities for RecentActivitiesCard ---
        const recentUsers = await ctx.db.query("users").order("desc").take(5);
        const recentActivities = recentUsers.map(u => ({
             id: u._id,
             type: u.role,
             action: 'created',
             description: `New ${u.role}: ${u.firstName} ${u.lastName}`,
             timestamp: new Date(u.createdAt).toISOString(),
             user: "System"
        }));

        return {
            metrics: {
                activeProfessors,
                activeStudents,
                activeCourses,
                activePrograms,
                totalEnrollments,
                activeSections,
                currentPeriod: currentPeriod?.nameEs ?? "N/A",
                pendingEnrollments: pendingEnrollments.length,
            },
            upcomingDeadlines,
            recentActivities,
        };
    },
});

/**
 * Get system-wide statistics (Admin only)
 */
export const getSystemStatistics = query({
    args: {
        periodId: v.optional(v.id("periods")),
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

        const targetPeriod = args.periodId
            ? await ctx.db.get(args.periodId)
            : await getCurrentPeriod(ctx.db);

        // If no period exists, return empty statistics
        if (!targetPeriod) {
            return {
                period: null,
                enrollmentStats: {
                    total: 0,
                    enrolled: 0,
                    completed: 0,
                    withdrawn: 0,
                    failed: 0,
                },
                gradeStats: {
                    graded: 0,
                    pending: 0,
                    distribution: {
                        "A+": 0, "A": 0, "A-": 0,
                        "B+": 0, "B": 0, "B-": 0,
                        "C+": 0, "C": 0, "C-": 0,
                        "D+": 0, "D": 0, "F": 0
                    },
                    averageGrade: 0,
                },
                sectionStats: {
                    total: 0,
                    gradesSubmitted: 0,
                    gradesPending: 0,
                }
            };
        }

        // Get enrollments for the period
        const enrollments = await ctx.db
            .query("enrollments")
            .filter(q => q.eq(q.field("periodId"), targetPeriod._id))
            .collect();

        // Get sections for the period
        const sections = await ctx.db
            .query("sections")
            .withIndex("by_period_status_active", q =>
                q.eq("periodId", targetPeriod._id).eq("status", "active").eq("isActive", true))
            .collect();

        // Calculate grade distribution
        const gradedEnrollments = enrollments.filter(e => e.percentageGrade !== undefined);
        const gradeDistribution = {
            "A+": 0, "A": 0, "A-": 0,
            "B+": 0, "B": 0, "B-": 0,
            "C+": 0, "C": 0, "C-": 0,
            "D+": 0, "D": 0, "F": 0
        };

        gradedEnrollments.forEach(enrollment => {
            if (enrollment.letterGrade && enrollment.letterGrade in gradeDistribution) {
                gradeDistribution[enrollment.letterGrade as keyof typeof gradeDistribution]++;
            }
        });

        return {
            period: targetPeriod,
            enrollmentStats: {
                total: enrollments.length,
                enrolled: enrollments.filter(e => e.status === "enrolled").length,
                completed: enrollments.filter(e => e.status === "completed").length,
                withdrawn: enrollments.filter(e => e.status === "withdrawn").length,
                failed: enrollments.filter(e => e.status === "failed").length,
            },
            gradeStats: {
                graded: gradedEnrollments.length,
                pending: enrollments.filter(e => e.percentageGrade === undefined).length,
                distribution: gradeDistribution,
                averageGrade: gradedEnrollments.length > 0 ?
                    gradedEnrollments.reduce((sum, e) => sum + (e.percentageGrade || 0), 0) / gradedEnrollments.length
                    : 0,
            },
            sectionStats: {
                total: sections.length,
                gradesSubmitted: sections.filter(s => s.gradesSubmitted).length,
                gradesPending: sections.filter(s => !s.gradesSubmitted).length,
            }
        };
    },
});