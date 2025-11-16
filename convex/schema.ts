/* THIS NEEDS REFACTORING */

import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  /**
   * Users table - Students, Professors, Admins
   */
  users: defineTable({
    // Authentication
    clerkId: v.string(),
    email: v.string(),

    // Personal information
    firstName: v.string(),
    lastName: v.string(),

    // Additional fields for certificates
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

    // Contact
    phone: v.optional(v.string()),
    country: v.optional(v.string()),

    // System fields
    role: v.union(
      v.literal("student"),
      v.literal("professor"),
      v.literal("admin"),
      v.literal("superadmin"),
    ),
    isActive: v.boolean(),

    // Student-specific
    studentProfile: v.optional(
      v.object({
        studentCode: v.string(), // Student ID number
        programId: v.id("programs"),
      }),
    ),
  })
    .index("by_clerk_id", ["clerkId"])
    .index("by_email", ["email"])
    .index("by_role_active", ["role", "isActive"])
    .index("by_document", ["documentType", "documentNumber"]),

  /**
   * Program categories
   * Simple lookup table for program classification (e.g., Engineering, Business)
   */
  program_categories: defineTable({
    name: v.string(),
  }).index("by_name", ["name"]),

  /**
   * Academic programs
   * Note: code and codeEn are optional and used based on the 'language' field:
   * - language="es" → code is required (Spanish code)
   * - language="en" → codeEn is required (English code)
   * - language="both" → both code and codeEn are required
   * All language-specific fields are validated in backend based on the 'language' field.
   */
  programs: defineTable({
    codeEs: v.optional(v.string()), // Spanish code, required when language is "es" or "both"
    codeEn: v.optional(v.string()), // English code, required when language is "en" or "both"
    nameEs: v.optional(v.string()), // Spanish name, required when language is "es" or "both"
    nameEn: v.optional(v.string()), // English name, required when language is "en" or "both"
    descriptionEs: v.optional(v.string()), // Spanish description, required when language is "es" or "both"
    descriptionEn: v.optional(v.string()), // English description, required when language is "en" or "both"

    type: v.union(
      v.literal("diploma"),
      v.literal("bachelor"),
      v.literal("master"),
      v.literal("doctorate"),
    ),

    degree: v.optional(v.string()), // "Bachelor of Arts", "Master of Science", etc.
    categoryId: v.optional(v.id("program_categories")), // Reference to program_categories table

    language: v.union(v.literal("es"), v.literal("en"), v.literal("both")),

    totalCredits: v.number(),
    durationBimesters: v.number(),

    // Costs (optional for financial module)
    tuitionPerCredit: v.optional(v.number()),

    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
  })
    .index("by_active", ["isActive"]) // For admin dashboard summary
    .index("by_category", ["categoryId"])
    .index("by_type_active", ["type", "isActive"])
    .index("by_language_active", ["language", "isActive"]), // Combined for efficiency

  /**
   * Bimesters - Academic periods
   * Active status is computed automatically based on current date:
   * A bimester is active if startDate <= now < endDate
   */
  bimesters: defineTable({
    startDate: v.number(), // When the bimester starts
    endDate: v.number(), // When the bimester ends
    gradeDeadline: v.number(), // Deadline for professors to submit grades

    isActive: v.boolean(), // Stored in DB but overridden in queries based on date range

    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
  })
    .index("by_active", ["isActive"])
    .index("by_start_date", ["startDate"])
    .index("by_dates", ["startDate", "endDate"]),

  /**
   * DEPRECATED - Academic periods (use 'bimesters' table instead)
   */
  periods: defineTable({
    code: v.string(), // "2024-B2"
    year: v.number(),
    bimesterNumber: v.number(), // 1-6

    nameEs: v.string(), // "Segundo Bimestre 2024"
    nameEn: v.optional(v.string()), // "Second Bimester 2024"

    // Period dates
    startDate: v.number(),
    endDate: v.number(),

    // Important dates
    enrollmentStart: v.number(),
    enrollmentEnd: v.number(),
    addDropDeadline: v.optional(v.number()),
    withdrawalDeadline: v.optional(v.number()),
    gradingStart: v.optional(v.number()),
    gradingDeadline: v.number(),

    status: v.union(
      v.literal("planning"),
      v.literal("enrollment"),
      v.literal("active"),
      v.literal("grading"),
      v.literal("closed"),
    ),

    isCurrentPeriod: v.boolean(),

    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
  })
    .index("by_year_bimester", ["year", "bimesterNumber"])
    .index("by_status", ["status"])
    .index("by_current", ["isCurrentPeriod"])
    .index("by_dates", ["startDate", "endDate"]),

  /**
   * Course catalog (shared across programs)
   * Code and language fields are interconnected:
   * - language "es" uses code (Spanish code)
   * - language "en" uses codeEn (English code)
   * - language "both" uses both code and codeEn
   *
   * Name and description fields are also language-dependent:
   * - language "es" requires code, nameEs, and descriptionEs
   * - language "en" requires codeEn, nameEn, and descriptionEn
   * - language "both" requires all fields: code, codeEn, nameEs, nameEn, descriptionEs, descriptionEn
   *
   * Note: by_code index removed to allow optional code field
   */
  courses: defineTable({
    codeEs: v.optional(v.string()), // Required when language is "es" or "both"
    codeEn: v.optional(v.string()), // Required when language is "en" or "both"
    nameEs: v.optional(v.string()), // Required when language is "es" or "both"
    nameEn: v.optional(v.string()), // Required when language is "en" or "both"
    descriptionEs: v.optional(v.string()), // Required when language is "es" or "both"
    descriptionEn: v.optional(v.string()), // Required when language is "en" or "both"

    credits: v.number(),

    language: v.union(v.literal("es"), v.literal("en"), v.literal("both")),

    // Category for requirements
    category: v.union(
      v.literal("humanities"),
      v.literal("core"),
      v.literal("elective"),
      v.literal("general"),
    ),

    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
  })
    .index("by_active", ["isActive"]) // For listing all active courses
    .index("by_category_active", ["category", "isActive"])
    .index("by_language_active", ["language", "isActive"]), // Combined index

  /**
   * Program-Course relationship (many-to-many)
   * Allows courses to be shared across programs
   */
  program_courses: defineTable({
    programId: v.id("programs"),
    courseId: v.id("courses"),

    // Override category for this specific program (A course asociated to different programs
    // may have different categories)
    categoryOverride: v.optional(
      v.union(
        v.literal("humanities"),
        v.literal("core"),
        v.literal("elective"),
        v.literal("general"),
      ),
    ),

    // Is this course required for this program?
    isRequired: v.boolean(),

    isActive: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_course", ["courseId"])
    .index("by_program_course", ["programId", "courseId"]) // Serves both by_program and by_program_course queries
    .index("by_program_required", ["programId", "isRequired", "isActive"]), // Added isActive for better filtering

  /**
   * Classes - Simplified version of sections
   * Represents a specific offering of a course in a period
   */
  classes: defineTable({
    courseId: v.id("courses"),
    bimesterId: v.id("bimesters"),
    groupNumber: v.string(), // "01", "02", etc.

    professorId: v.id("users"),
  })
    .index("by_course_bimester", ["courseId", "bimesterId"])
    .index("by_bimester", ["bimesterId"])
    .index("by_professor_bimester", ["professorId", "bimesterId"])
    .index("by_course_bimester_group", [
      "courseId",
      "bimesterId",
      "groupNumber",
    ]),

  /**
   * Class enrollments - Students enrolled in classes with their grades
   * Separate table for efficient queries from both student and class perspectives
   */
  class_enrollments: defineTable({
    classId: v.id("classes"),
    studentId: v.id("users"),

    // Reference data for easier queries
    courseId: v.id("courses"),
    bimesterId: v.id("bimesters"),
    professorId: v.id("users"),

    // Enrollment tracking
    enrolledAt: v.number(),
    enrolledBy: v.id("users"),

    // Status
    status: v.union(
      v.literal("enrolled"),
      v.literal("dropped"),
      v.literal("withdrawn"),
      v.literal("completed"),
      v.literal("incomplete"),
      v.literal("failed"),
    ),
    statusChangedAt: v.optional(v.number()),
    statusChangedBy: v.optional(v.id("users")),
    statusChangeReason: v.optional(v.string()),

    // Grading
    percentageGrade: v.optional(v.number()), // 0-100
    letterGrade: v.optional(v.string()), // A, B+, C, etc.
    gradePoints: v.optional(v.number()), // 4.0 scale
    qualityPoints: v.optional(v.number()), // gradePoints * credits

    gradedBy: v.optional(v.id("users")),
    gradedAt: v.optional(v.number()),
    gradeNotes: v.optional(v.string()),

    // Academic tracking
    isRetake: v.boolean(),
    isAuditing: v.boolean(),
    countsForGPA: v.boolean(),
    countsForProgress: v.boolean(),

    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
  })
    .index("by_class", ["classId"])
    .index("by_student", ["studentId"])
    .index("by_student_bimester", ["studentId", "bimesterId"])
    .index("by_class_status", ["classId", "status"])
    .index("by_student_status", ["studentId", "status"])
    .index("by_course_bimester", ["courseId", "bimesterId"]),

  /**
   * DEPRECATED - Course sections (keeping for backwards compatibility)
   * Use 'classes' table instead for new implementations
   */
  sections: defineTable({
    courseId: v.id("courses"),
    periodId: v.id("periods"),
    groupNumber: v.string(), // "01", "02"
    crn: v.string(), // Course Reference Number

    professorId: v.id("users"),

    // Capacity management
    capacity: v.number(),
    enrolled: v.number(),
    waitlistCapacity: v.optional(v.number()),
    waitlisted: v.optional(v.number()),

    // Delivery method
    deliveryMethod: v.union(
      v.literal("online_sync"), // Synchronous online
      v.literal("online_async"), // Asynchronous online
      v.literal("hybrid"),
      v.literal("in_person"),
    ),

    // Virtual schedule
    schedule: v.optional(
      v.object({
        sessions: v.array(
          v.object({
            day: v.union(
              v.literal("monday"),
              v.literal("tuesday"),
              v.literal("wednesday"),
              v.literal("thursday"),
              v.literal("friday"),
              v.literal("saturday"),
              v.literal("sunday"),
            ),
            startTime: v.string(), // "14:00"
            endTime: v.string(), // "16:00"
            roomUrl: v.optional(v.string()), // Zoom/Meet link
          }),
        ),
        timezone: v.string(), // "America/Bogota"
        notes: v.optional(v.string()),
      }),
    ),

    // Status tracking
    status: v.union(
      v.literal("draft"),
      v.literal("open"),
      v.literal("closed"),
      v.literal("active"),
      v.literal("grading"),
      v.literal("completed"),
    ),

    gradesSubmitted: v.boolean(),
    gradesSubmittedAt: v.optional(v.number()),

    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
  })
    .index("by_crn", ["crn"])
    .index("by_course_period", ["courseId", "periodId"])
    .index("by_period_status_active", ["periodId", "status", "isActive"]) // Combined index
    .index("by_professor_period", ["professorId", "periodId", "isActive"]), // Added isActive for filtering

  /**
   * Student enrollments with grades
   */
  enrollments: defineTable({
    // Core references
    studentId: v.id("users"),
    sectionId: v.id("sections"),

    // Denormalized for performance
    periodId: v.id("periods"),
    courseId: v.id("courses"),
    professorId: v.id("users"),

    // Enrollment tracking
    enrolledAt: v.number(),
    enrolledBy: v.optional(v.id("users")), // Who enrolled the student

    // Status
    status: v.union(
      v.literal("enrolled"),
      v.literal("withdrawn"), // Before deadline
      v.literal("dropped"), // After deadline
      v.literal("completed"),
      v.literal("failed"),
      v.literal("incomplete"),
      v.literal("in_progress"),
    ),

    // Status change tracking
    statusChangedAt: v.optional(v.number()),
    statusChangedBy: v.optional(v.id("users")),
    statusChangeReason: v.optional(v.string()),

    // AMERICAN GRADING SYSTEM
    // Professor enters percentage, system calculates the rest
    percentageGrade: v.optional(v.number()), // 0-100
    letterGrade: v.optional(v.string()), // A+, A, A-, B+, etc.
    gradePoints: v.optional(v.number()), // 4.0 scale
    qualityPoints: v.optional(v.number()), // gradePoints * credits

    // Grade metadata
    gradedBy: v.optional(v.id("users")),
    gradedAt: v.optional(v.number()),
    gradeNotes: v.optional(v.string()),
    lastGradeUpdate: v.optional(v.number()),

    // Special flags
    isRetake: v.boolean(),
    isAuditing: v.boolean(),
    countsForGPA: v.boolean(),
    countsForProgress: v.boolean(),

    // For incomplete grades
    incompleteDeadline: v.optional(v.number()),

    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
  })
    .index("by_student_period", ["studentId", "periodId"])
    .index("by_student_section", ["studentId", "sectionId"])
    .index("by_section", ["sectionId"])
    .index("by_student_course", ["studentId", "courseId"])
    .index("by_status_period", ["status", "periodId"])
    .index("by_professor_period", ["professorId", "periodId"]),

  /**
   * Program requirements for progress tracking
   */
  program_requirements: defineTable({
    programId: v.id("programs"),

    // Credit distribution
    requirements: v.object({
      humanities: v.object({
        required: v.number(),
        description: v.optional(v.string()),
      }),
      core: v.object({
        required: v.number(),
        description: v.optional(v.string()),
      }),
      elective: v.object({
        required: v.number(),
        minPerCategory: v.optional(v.number()),
        description: v.optional(v.string()),
      }),
      general: v.object({
        required: v.number(),
        description: v.optional(v.string()),
      }),
      total: v.number(),
    }),

    // Graduation requirements
    minGPA: v.number(), // Minimum GPA to graduate
    minCGPA: v.optional(v.number()), // Minimum cumulative GPA
    maxBimesters: v.number(),
    maxYears: v.optional(v.number()),

    // Probation thresholds
    probationGPA: v.optional(v.number()),
    suspensionGPA: v.optional(v.number()),

    effectiveDate: v.number(),
    endDate: v.optional(v.number()),
    isActive: v.boolean(),

    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
  })
    .index("by_program_active", ["programId", "isActive"])
    .index("by_program_dates", ["programId", "effectiveDate"]),

  /**
   * Section announcements
   */
  announcements: defineTable({
    sectionId: v.id("sections"),
    authorId: v.id("users"),

    title: v.string(),
    content: v.string(),

    // Type/Priority
    type: v.union(
      v.literal("general"),
      v.literal("assignment"),
      v.literal("exam"),
      v.literal("schedule"),
      v.literal("urgent"),
    ),

    // Visibility
    isPublished: v.boolean(),
    publishedAt: v.optional(v.number()),

    // Optional expiration
    expiresAt: v.optional(v.number()),

    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
  })
    .index("by_section_published", ["sectionId", "isPublished"])
    .index("by_author", ["authorId"])
    .index("by_type", ["type"])
    .index("by_created", ["createdAt"]),

  /**
   * Document generation audit log
   * Tracks all certificates, transcripts, and reports generated
   */
  document_logs: defineTable({
    // Who requested the document
    requestedBy: v.id("users"),
    requestedFor: v.id("users"), // Can be different for admin generating for student

    // Document details
    documentType: v.union(
      v.literal("transcript"),
      v.literal("enrollment_certificate"),
      v.literal("grade_report"),
      v.literal("completion_certificate"),
      v.literal("degree"),
      v.literal("schedule"),
      v.literal("other"),
    ),

    // Scope
    scope: v.optional(
      v.object({
        periodId: v.optional(v.id("periods")),
        programId: v.optional(v.id("programs")),
        fromDate: v.optional(v.number()),
        toDate: v.optional(v.number()),
        includeInProgress: v.optional(v.boolean()),
      }),
    ),

    // Document metadata
    format: v.union(
      v.literal("pdf"),
      v.literal("html"),
      v.literal("csv"),
      v.literal("json"),
    ),

    language: v.union(v.literal("es"), v.literal("en")),

    // Storage reference (could be URL, file ID, etc.)
    documentUrl: v.optional(v.string()),
    documentHash: v.optional(v.string()), // For integrity verification

    // Status
    status: v.union(
      v.literal("pending"),
      v.literal("generating"),
      v.literal("completed"),
      v.literal("failed"),
      v.literal("expired"),
    ),

    errorMessage: v.optional(v.string()),

    // Timestamps
    generatedAt: v.number(),
    expiresAt: v.optional(v.number()),

    // IP tracking for security
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
  })
    .index("by_requested_by", ["requestedBy", "generatedAt"]) // Added generatedAt for sorting
    .index("by_requested_for_type", ["requestedFor", "documentType", "status"]) // Combined index
    .index("by_generated", ["generatedAt"]),

  systemLogs: defineTable({
    entityId: v.optional(v.string()),
    entityType: v.string(), // "enrollment", "professor", "student", "course", "program"
    action: v.string(), // "created", "updated", "deleted"
    description: v.string(),
    userId: v.optional(v.id("users")),
    metadata: v.optional(v.any()),
  })
    .index("by_entityType", ["entityType"])
    .index("by_action", ["action"])
    .index("by_userId", ["userId"]),
});

/**
 * CONVEX LIMITS AND PERFORMANCE CONSIDERATIONS:
 *
 * 1. Document size: Max 1MB per document (we're well below with our schema)
 * 2. Nesting depth: Max 16 levels (our max is 3 levels)
 * 3. Index limit: Max 32 indexes per table (we use 3-5 per table)
 * 4. Query performance:
 *    - Indexes prevent full table scans on large tables (1000+ docs)
 *    - Compound indexes can serve multiple query patterns
 *    - First field in compound index should be most selective
 * 5. Denormalization trade-offs:
 *    - enrollments table includes periodId, courseId, professorId for fast dashboards
 *    - Reduces query complexity at the cost of storage
 *
 * EXPECTED SCALE:
 * - ~250 active students (from PDF requirements)
 * - ~9,000 historical enrollment records
 * - 6 periods per year
 * - Multiple programs with shared courses
 *
 * INDEX STRATEGY:
 * - Primary access patterns covered by compound indexes
 * - No redundant indexes (compound indexes serve prefix queries)
 * - Status fields included in indexes for filtering active records
 * - Timestamp fields in indexes for sorting and pagination
 */
