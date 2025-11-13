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
      return null; // Keep this - user might not be authenticated yet
    }

    const user = await getUserByClerkId(ctx.db, identity.subject);
    if (!user || user.role !== "student" || !user.studentProfile) {
      return null; // Return null for graceful handling
    }

    const currentPeriod = await getCurrentPeriod(ctx.db);

    const program = await ctx.db.get(user.studentProfile.programId);
    if (!program) {
      throw new ConvexError("Program not found");
    }

    const currentEnrollments = currentPeriod
      ? await ctx.db
          .query("enrollments")
          .withIndex("by_student_period", (q) =>
            q.eq("studentId", user._id).eq("periodId", currentPeriod._id),
          )
          .collect()
      : [];

    const completedEnrollments = await ctx.db
      .query("enrollments")
      .withIndex("by_student_period", (q) => q.eq("studentId", user._id))
      .filter((q) => q.eq(q.field("status"), "completed"))
      .collect();

    const totalCreditsEarned = await Promise.all(
      completedEnrollments.map(async (enrollment) => {
        const course = await ctx.db.get(enrollment.courseId);
        return course?.credits || 0;
      }),
    ).then((credits) => credits.reduce((sum, credit) => sum + credit, 0));

    const completionPercentage = program?.totalCredits
      ? Math.round((totalCreditsEarned / program.totalCredits) * 100)
      : 0;

    const enrollmentDetails = await Promise.all(
      currentEnrollments.map(async (enrollment) => {
        const [section, course, professor] = await Promise.all([
          ctx.db.get(enrollment.sectionId),
          ctx.db.get(enrollment.courseId),
          ctx.db.get(enrollment.professorId),
        ]);
        return { enrollment, section, course, professor };
      }),
    );

    const academicProgress = await calculateAcademicProgress(ctx.db, user._id);
    const allEnrollments = await ctx.db
      .query("enrollments")
      .withIndex("by_student_period", (q) => q.eq("studentId", user._id))
      .filter((q) => q.eq(q.field("countsForGPA"), true))
      .collect();

    const gpaResult = await calculateGPA(ctx.db, allEnrollments);
    const periodGpaResult = await calculateGPA(
      ctx.db,
      currentEnrollments.filter((e) => e.countsForGPA),
    );

    // Format current subjects data
    const currentSubjects = {
      currentPeriod: currentPeriod?.nameEs || "No Active Period",
      enrolledSubjects: enrollmentDetails.length,
      creditsInProgress: enrollmentDetails.reduce(
        (sum, e) => sum + (e.course?.credits || 0),
        0,
      ),
      subjects: enrollmentDetails.map(({ course, enrollment }) => ({
        code: course?.codeEs || "N/A",
        name: course?.nameEs || "Unknown Course",
        credits: course?.credits || 0,
        grade: enrollment.letterGrade,
        percentage: enrollment.percentageGrade,
        // Make sure status values exactly match the expected literal types
        status:
          enrollment.status === "completed"
            ? ("completed" as const)
            : enrollment.status === "enrolled"
              ? ("in-progress" as const)
              : enrollment.status === "in_progress"
                ? ("in-progress" as const)
                : ("pending" as const),
      })),
    };

    // Format metrics data
    const metrics = {
      completedCredits: totalCreditsEarned,
      totalCredits: program?.totalCredits || 0,
      completionPercentage: completionPercentage,
      creditsRemaining: (program?.totalCredits || 0) - totalCreditsEarned,
      gpa: gpaResult.gpa,
      currentPeriod: currentPeriod?.nameEs || "N/A",
      enrolledSubjects: enrollmentDetails.length,
      creditsInProgress: enrollmentDetails.reduce(
        (sum, e) => sum + (e.course?.credits || 0),
        0,
      ),
      currentBimester: 1,
      progressPercentage: completionPercentage,
      bimestersRemaining: Math.max(0, (program?.durationBimesters || 8) - 1),
    };

    // Format credit distribution data
    const creditDistribution = {
      core: {
        completed: academicProgress?.creditsByCategory?.core?.completed || 0,
        total: academicProgress?.creditsByCategory?.core?.required || 0,
      },
      humanities: {
        completed:
          academicProgress?.creditsByCategory?.humanities?.completed || 0,
        total: academicProgress?.creditsByCategory?.humanities?.required || 0,
      },
      electives: {
        completed:
          academicProgress?.creditsByCategory?.elective?.completed || 0,
        total: academicProgress?.creditsByCategory?.elective?.required || 0,
      },
    };

    // Create upcoming dates data (could be deadlines, exam dates, etc.)
    const upcomingDates = currentPeriod
      ? [
          {
            id: `${currentPeriod._id}-enrollment-end`,
            title: "Enrollment Deadline",
            date: new Date(currentPeriod.enrollmentEnd).toISOString(),
            type: "deadline" as const,
          },
          {
            id: `${currentPeriod._id}-period-end`,
            title: "Period End Date",
            date: new Date(currentPeriod.endDate).toISOString(),
            type: "deadline" as const,
          },
          // Add other relevant dates from current enrollments or academic calendar
        ].filter((date) => new Date(date.date).getTime() > Date.now())
      : [];

    // Return both the newly formatted data needed by components
    // and the original data for backward compatibility
    return {
      // Original data structure
      user: { ...user, program },
      currentPeriod,
      enrollments: enrollmentDetails,
      academicProgress,
      gpa: { cumulative: gpaResult, period: periodGpaResult },
      summary: {
        totalCreditsEnrolled: enrollmentDetails.reduce(
          (sum, e) => sum + (e.course?.credits || 0),
          0,
        ),
        completedCourses: allEnrollments.filter((e) => e.status === "completed")
          .length,
        totalCourses: allEnrollments.length,
        academicStanding:
          user.studentProfile.academicStanding || "good_standing",
      },

      // New data structure for the dashboard components
      programInfo: { program, user },
      metrics,
      currentSubjects,
      creditDistribution,
      upcomingDates,
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
      return null;
    }

    const user = await getUserByClerkId(ctx.db, identity.subject);
    if (!user || user.role !== "professor") {
      return null;
    }

    const now = Date.now();
    const currentPeriod = await getCurrentPeriod(ctx.db);
    if (!currentPeriod) {
      return {
        metrics: {
          currentPeriod: "No Active Period",
          totalSections: 0,
          totalStudents: 0,
          sectionsToGrade: 0,
          averageEnrollment: 0,
          totalCreditsTeaching: 0,
          periodsTaught: 0,
          totalStudentsTaught: 0,
        },
        currentPeriod: "No Active Period",
        totalSections: 0,
        totalStudents: 0,
        sectionsToGrade: 0,
        sections: [],
        upcomingClosingDates: [],
      };
    }

    // --- 1. Fetch Core Data ---
    const allTimeSections = await ctx.db
      .query("sections")
      .withIndex("by_professor_period", (q) => q.eq("professorId", user._id))
      .collect();

    const allTimeEnrollments = await ctx.db
      .query("enrollments")
      .filter((q) => q.eq(q.field("professorId"), user._id))
      .collect();

    // Use existing helper function
    const currentSections = await getProfessorSections(
      ctx.db,
      user._id,
      currentPeriod._id,
    );

    // --- 2. Shape Data for Frontend Cards ---
    const sectionsDetails = await Promise.all(
      currentSections.map(async (section) => {
        const course = await ctx.db.get(section.courseId);

        // Map database category to the expected frontend category
        let category: "general" | "professional" | "specialty" = "general";
        if (course?.category === "core") category = "professional";
        else if (course?.category === "elective") category = "specialty";

        // Map database status to the expected frontend status
        let status: "active" | "grading" | "closed" = "active";
        if (section.status === "grading") status = "grading";
        else if (section.status === "completed") status = "closed";

        return {
          id: section._id,
          courseCode: course?.codeEs ?? "N/A",
          courseName: course?.nameEs ?? "Unknown",
          groupNumber: parseInt(section.groupNumber), // Convert to number
          credits: course?.credits ?? 0,
          enrolledStudents: section.enrolled,
          closingDate: new Date(currentPeriod.gradingDeadline).toISOString(),
          category: category,
          status: status,
          schedule:
            section.schedule?.sessions
              .map((s) => `${s.day.slice(0, 3)} ${s.startTime}-${s.endTime}`)
              .join(", ") || "No schedule",
        };
      }),
    );

    const upcomingClosingDates = sectionsDetails
      .filter((s) => new Date(s.closingDate).getTime() > now)
      .map((s) => ({
        courseCode: s.courseCode,
        courseName: s.courseName,
        groupNumber: s.groupNumber,
        closingDate: s.closingDate,
        daysRemaining: Math.ceil(
          (new Date(s.closingDate).getTime() - now) / (1000 * 60 * 60 * 24),
        ),
      }))
      .sort((a, b) => a.daysRemaining - b.daysRemaining);

    // --- 3. Calculate Metrics ---
    const totalCreditsTeaching = sectionsDetails.reduce(
      (sum, s) => sum + s.credits,
      0,
    );
    const sectionsToGrade = currentSections.filter(
      (s) =>
        s.status === "grading" || (s.status === "active" && !s.gradesSubmitted),
    ).length;
    const totalStudentsCurrent = currentSections.reduce(
      (sum, s) => sum + s.enrolled,
      0,
    );

    // Return both the flat properties for compatibility with ProfessorDashboardData
    // and the nested metrics for ProfessorMetricsGrid
    return {
      // Flat structure for compatibility with ProfessorDashboardData
      currentPeriod: currentPeriod.nameEs,
      totalSections: currentSections.length,
      totalStudents: totalStudentsCurrent,
      sectionsToGrade,
      sections: sectionsDetails,
      upcomingClosingDates,

      // Nested metrics for ProfessorMetricsGrid
      metrics: {
        currentPeriod: currentPeriod.nameEs,
        totalSections: currentSections.length,
        totalStudents: totalStudentsCurrent,
        sectionsToGrade,
        averageEnrollment:
          currentSections.length > 0
            ? totalStudentsCurrent / currentSections.length
            : 0,
        totalCreditsTeaching,
        periodsTaught: new Set(allTimeSections.map((s) => s.periodId)).size,
        totalStudentsTaught: allTimeEnrollments.length,
      },
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
    if (!identity) {
      console.log("[getAdminDashboard] No identity found");
      return null; // Return null instead of throwing
    }

    const user = await getUserByClerkId(ctx.db, identity.subject);
    if (!user) {
      console.log(
        "[getAdminDashboard] User not found in database for clerkId:",
        identity.subject,
      );
      return null; // Return null instead of throwing
    }

    if (user.role !== "admin" && user.role !== "superadmin") {
      console.log(
        "[getAdminDashboard] User role check failed. Current role:",
        user.role,
      );
      return null; // Return null instead of throwing
    }

    const currentPeriod = await getCurrentPeriod(ctx.db);
    const now = Date.now();

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
      ctx.db
        .query("enrollments")
        .collect()
        .then((e) => e.length),
      currentPeriod
        ? ctx.db
            .query("sections")
            .withIndex("by_period_status_active", (q) =>
              q.eq("periodId", currentPeriod._id),
            )
            .collect()
            .then((s) => s.length)
        : 0,
    ]);
    const pendingEnrollments = await ctx.db
      .query("enrollments")
      .withIndex("by_status_period", (q) => q.eq("status", "enrolled"))
      .collect();

    // --- 2. Upcoming Deadlines for UpcomingDeadlinesCard ---
    const upcomingPeriods = await ctx.db
      .query("periods")
      .filter((q) => q.gt(q.field("endDate"), now))
      .collect();

    const upcomingDeadlines = upcomingPeriods
      .flatMap((period) => {
        const deadlines = [];
        if (period.enrollmentEnd > now) {
          deadlines.push({
            id: `${period._id}-enroll`,
            title: "Enrollment Deadline",
            description: `For period ${period.code}`,
            date: new Date(period.enrollmentEnd).toISOString(),
            daysRemaining: Math.ceil(
              (period.enrollmentEnd - now) / (1000 * 60 * 60 * 24),
            ),
            type: "enrollment" as const,
          });
        }
        if (period.gradingDeadline > now) {
          deadlines.push({
            id: `${period._id}-grade`,
            title: "Grade Submission",
            description: `For period ${period.code}`,
            date: new Date(period.gradingDeadline).toISOString(),
            daysRemaining: Math.ceil(
              (period.gradingDeadline - now) / (1000 * 60 * 60 * 24),
            ),
            type: "grading" as const,
          });
        }
        return deadlines;
      })
      .sort((a, b) => a.daysRemaining - b.daysRemaining)
      .slice(0, 4);

    // --- 3. Enhanced Recent Activities for RecentActivitiesCard ---
    // Get a mix of different activity types for a more comprehensive view
    const recentUsers = await ctx.db.query("users").order("desc").take(3);
    const recentCourses = await ctx.db.query("courses").order("desc").take(2);
    const recentEnrollments = await ctx.db
      .query("enrollments")
      .order("desc")
      .take(2);

    // Combine and enrich activities
    const userActivities = await Promise.all(
      recentUsers.map(async (u) => ({
        id: u._id,
        type: u.role as any,
        action: "created" as const,
        description: `New ${u.role}: ${u.firstName} ${u.lastName}`,
        timestamp: new Date(u._creationTime).toISOString(),
        user: "System",
      })),
    );

    const courseActivities = await Promise.all(
      recentCourses.map(async (c) => ({
        id: c._id,
        type: "course" as const,
        action: "created" as const,
        description: `New course added: ${c.codeEs} - ${c.nameEs}`,
        timestamp: new Date(c._creationTime).toISOString(),
        user: "System",
      })),
    );

    const enrollmentActivities = await Promise.all(
      recentEnrollments.map(async (e) => {
        const [student, course] = await Promise.all([
          ctx.db.get(e.studentId),
          ctx.db.get(e.courseId),
        ]);
        return {
          id: e._id,
          type: "enrollment" as const,
          action: "created" as const,
          description: `New enrollment: ${student?.firstName} ${student?.lastName} in ${course?.codeEs || "Unknown course"}`,
          timestamp: new Date(e._creationTime).toISOString(),
          user: "System",
        };
      }),
    );

    // Combine all activities and sort by timestamp
    const recentActivities = [
      ...userActivities,
      ...courseActivities,
      ...enrollmentActivities,
    ]
      .sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      )
      .slice(0, 5);

    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
    const sixtyDaysAgo = now - 60 * 24 * 60 * 60 * 1000;

    const [
      previousEnrollmentCount,
      previousSectionsCount,
      previousPendingEnrollments,
      completedEnrollments,
      totalEnrollmentsCount,
    ] = await Promise.all([
      ctx.db
        .query("enrollments")
        .filter((q) =>
          q.and(
            q.lt(q.field("_creationTime"), thirtyDaysAgo),
            q.gte(q.field("_creationTime"), sixtyDaysAgo),
          ),
        )
        .collect()
        .then((e) => e.length),
      ctx.db
        .query("sections")
        .filter((q) =>
          q.and(
            q.lt(q.field("_creationTime"), thirtyDaysAgo),
            q.gte(q.field("_creationTime"), sixtyDaysAgo),
            q.eq(q.field("status"), "active"),
          ),
        )
        .collect()
        .then((s) => s.length),
      ctx.db
        .query("enrollments")
        .withIndex("by_status_period", (q) => q.eq("status", "enrolled"))
        .filter((q) => q.lt(q.field("_creationTime"), thirtyDaysAgo))
        .collect()
        .then((e) => e.length),
      ctx.db
        .query("enrollments")
        .filter((q) => q.eq(q.field("status"), "completed"))
        .collect()
        .then((e) => e.length),
      totalEnrollments,
    ]);

    // Calculate changes and trends
    const calculateChange = (current: number, previous: number) => {
      if (previous === 0) return { value: 0, trend: "neutral" as const };
      const change = ((current - previous) / previous) * 100;
      return {
        value: parseFloat(change.toFixed(1)),
        trend: change >= 0 ? ("up" as const) : ("down" as const),
      };
    };

    const enrollmentChange = calculateChange(
      totalEnrollments,
      previousEnrollmentCount,
    );
    const sectionsChange = calculateChange(
      activeSections,
      previousSectionsCount,
    );
    const pendingChange = calculateChange(
      pendingEnrollments.length,
      previousPendingEnrollments,
    );

    // Calculate completion rate
    const completionRate =
      totalEnrollments > 0
        ? Math.round((completedEnrollments / totalEnrollmentsCount) * 100)
        : 0;

    // Create quick stats array
    const quickStats = [
      {
        label: "Total Enrollments",
        value: totalEnrollments,
        change: enrollmentChange.value,
        trend: enrollmentChange.trend,
        link: "/admin/enrollments",
      },
      {
        label: "Active Sections",
        value: activeSections,
        change: sectionsChange.value,
        trend: sectionsChange.trend,
        link: "/admin/sections",
      },
      {
        label: "Pending Enrollments",
        value: pendingEnrollments.length,
        change: pendingChange.value,
        trend: pendingChange.trend,
        link: "/admin/enrollments",
      },
      {
        label: "Course Completion Rate",
        value: completionRate,
        change: 0, // Historical data may not be available yet
        trend: "neutral" as const,
      },
    ];

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
      quickStats,
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
            "A+": 0,
            A: 0,
            "A-": 0,
            "B+": 0,
            B: 0,
            "B-": 0,
            "C+": 0,
            C: 0,
            "C-": 0,
            "D+": 0,
            D: 0,
            F: 0,
          },
          averageGrade: 0,
        },
        sectionStats: {
          total: 0,
          gradesSubmitted: 0,
          gradesPending: 0,
        },
      };
    }

    // Get enrollments for the period
    const enrollments = await ctx.db
      .query("enrollments")
      .filter((q) => q.eq(q.field("periodId"), targetPeriod._id))
      .collect();

    // Get sections for the period
    const sections = await ctx.db
      .query("sections")
      .withIndex("by_period_status_active", (q) =>
        q
          .eq("periodId", targetPeriod._id)
          .eq("status", "active")
          .eq("isActive", true),
      )
      .collect();

    // Calculate grade distribution
    const gradedEnrollments = enrollments.filter(
      (e) => e.percentageGrade !== undefined,
    );
    const gradeDistribution = {
      "A+": 0,
      A: 0,
      "A-": 0,
      "B+": 0,
      B: 0,
      "B-": 0,
      "C+": 0,
      C: 0,
      "C-": 0,
      "D+": 0,
      D: 0,
      F: 0,
    };

    gradedEnrollments.forEach((enrollment) => {
      if (
        enrollment.letterGrade &&
        enrollment.letterGrade in gradeDistribution
      ) {
        gradeDistribution[
          enrollment.letterGrade as keyof typeof gradeDistribution
        ]++;
      }
    });

    return {
      period: targetPeriod,
      enrollmentStats: {
        total: enrollments.length,
        enrolled: enrollments.filter((e) => e.status === "enrolled").length,
        completed: enrollments.filter((e) => e.status === "completed").length,
        withdrawn: enrollments.filter((e) => e.status === "withdrawn").length,
        failed: enrollments.filter((e) => e.status === "failed").length,
      },
      gradeStats: {
        graded: gradedEnrollments.length,
        pending: enrollments.filter((e) => e.percentageGrade === undefined)
          .length,
        distribution: gradeDistribution,
        averageGrade:
          gradedEnrollments.length > 0
            ? gradedEnrollments.reduce(
                (sum, e) => sum + (e.percentageGrade || 0),
                0,
              ) / gradedEnrollments.length
            : 0,
      },
      sectionStats: {
        total: sections.length,
        gradesSubmitted: sections.filter((s) => s.gradesSubmitted).length,
        gradesPending: sections.filter((s) => !s.gradesSubmitted).length,
      },
    };
  },
});
