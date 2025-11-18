/**
 * Convex action for importing class enrollments from JSONL
 *
 * This action processes a JSONL file where each line represents a unique class
 * with its enrolled students and their grades.
 *
 * For each class:
 * 1. Resolves all required IDs (program, course, bimester, professor)
 * 2. Creates or finds the class
 * 3. For each student: creates enrollment and updates grade to "completed" status
 */

import { v } from "convex/values";
import { action } from "./_generated/server";
import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

type ClassEnrollmentJSONL = {
  programCode: string;
  courseCode: string;
  bimesterName: string;
  groupNumber: string;
  professorEmail: string;
  students: {
    studentCode: string;
    percentageGrade: number;
  }[];
};

type ImportError = {
  line?: number;
  classKey?: string;
  studentCode?: string;
  type:
    | "program_not_found"
    | "course_not_found"
    | "bimester_not_found"
    | "professor_not_found"
    | "student_not_found"
    | "invalid_grade"
    | "class_creation_failed"
    | "enrollment_failed"
    | "unknown";
  message: string;
  data?: any;
};

type ImportResult = {
  classesProcessed: number;
  classesCreated: number;
  classesAlreadyExisted: number;
  enrollmentsCreated: number;
  enrollmentsUpdated: number;
  errors: ImportError[];
  warnings: string[];
};

/**
 * Import class enrollments from JSONL format
 */
export const importClassEnrollmentsFromJSONL = action({
  args: {
    classes: v.array(
      v.object({
        programCode: v.string(),
        courseCode: v.string(),
        bimesterName: v.string(),
        groupNumber: v.string(),
        professorEmail: v.string(),
        students: v.array(
          v.object({
            studentCode: v.string(),
            percentageGrade: v.number(),
          }),
        ),
      }),
    ),
  },
  handler: async (ctx, args): Promise<ImportResult> => {
    const result: ImportResult = {
      classesProcessed: 0,
      classesCreated: 0,
      classesAlreadyExisted: 0,
      enrollmentsCreated: 0,
      enrollmentsUpdated: 0,
      errors: [],
      warnings: [],
    };

    // Pre-load all programs, courses, bimesters, and users into memory for fast lookup
    const [allPrograms, allCourses, allBimesters, allUsers] = await Promise.all(
      [
        ctx.runQuery(api.programs.getAllPrograms, {}),
        ctx.runQuery(api.courses.getAllCourses, {}),
        ctx.runQuery(api.bimesters.getAllBimesters),
        ctx.runQuery(api.users.getAllUsers, {}),
      ],
    );

    // Create lookup maps
    const programsByCode = new Map<string, Id<"programs">>();
    allPrograms.forEach((program) => {
      const codeEs = program.codeEs?.trim().toUpperCase();
      const codeEn = program.codeEn?.trim().toUpperCase();
      if (codeEs) programsByCode.set(codeEs, program._id);
      if (codeEn) programsByCode.set(codeEn, program._id);
    });

    const coursesByCode = new Map<string, Id<"courses">>();
    allCourses.forEach((course) => {
      const codeEs = course.codeEs?.trim().toUpperCase();
      const codeEn = course.codeEn?.trim().toUpperCase();
      if (codeEs) coursesByCode.set(codeEs, course._id);
      if (codeEn) coursesByCode.set(codeEn, course._id);
    });

    const bimestersByName = new Map<string, Id<"bimesters">>();
    allBimesters.forEach((bimester) => {
      const name = bimester.name.trim();
      bimestersByName.set(name, bimester._id);
    });

    const professorsByEmail = new Map<string, Id<"users">>();
    const studentsByCode = new Map<string, Id<"users">>();
    allUsers.forEach((user) => {
      if (user.role === "professor") {
        const email = user.email.trim().toLowerCase();
        professorsByEmail.set(email, user._id);
      }
      if (user.role === "student" && user.studentProfile?.studentCode) {
        const code = user.studentProfile.studentCode.trim().toUpperCase();
        studentsByCode.set(code, user._id);
      }
    });

    console.log("📊 Lookup maps created:");
    console.log(`  - Programs: ${programsByCode.size}`);
    console.log(`  - Courses: ${coursesByCode.size}`);
    console.log(`  - Bimesters: ${bimestersByName.size}`);
    console.log(`  - Professors: ${professorsByEmail.size}`);
    console.log(`  - Students: ${studentsByCode.size}`);

    // Process each class
    for (let i = 0; i < args.classes.length; i++) {
      const classData = args.classes[i];
      const classKey = `${classData.programCode}-${classData.courseCode}-${classData.bimesterName}-${classData.groupNumber}`;

      result.classesProcessed++;

      try {
        // 1. Resolve IDs
        const programCode = classData.programCode.trim().toUpperCase();
        const courseCode = classData.courseCode.trim().toUpperCase();
        const bimesterName = classData.bimesterName.trim();
        const professorEmail = classData.professorEmail.trim().toLowerCase();

        const programId = programsByCode.get(programCode);
        if (!programId) {
          result.errors.push({
            line: i + 1,
            classKey,
            type: "program_not_found",
            message: `Program not found: ${programCode}`,
            data: { programCode },
          });
          continue;
        }

        const courseId = coursesByCode.get(courseCode);
        if (!courseId) {
          result.errors.push({
            line: i + 1,
            classKey,
            type: "course_not_found",
            message: `Course not found: ${courseCode}`,
            data: { courseCode },
          });
          continue;
        }

        const bimesterId = bimestersByName.get(bimesterName);
        if (!bimesterId) {
          result.errors.push({
            line: i + 1,
            classKey,
            type: "bimester_not_found",
            message: `Bimester not found: ${bimesterName}`,
            data: { bimesterName },
          });
          continue;
        }

        const professorId = professorsByEmail.get(professorEmail);
        if (!professorId) {
          result.errors.push({
            line: i + 1,
            classKey,
            type: "professor_not_found",
            message: `Professor not found: ${professorEmail}`,
            data: { professorEmail },
          });
          continue;
        }

        // 2. Find or create class
        let classId: Id<"classes"> | null = null;

        // Check if class already exists
        const existingClasses = await ctx.runQuery(
          api.classes.getClassesByCourse,
          { courseId },
        );

        const existingClass = existingClasses.find(
          (c) =>
            c.bimesterId === bimesterId &&
            c.groupNumber === classData.groupNumber &&
            c.programId === programId,
        );

        if (existingClass) {
          classId = existingClass._id;
          result.classesAlreadyExisted++;
          result.warnings.push(
            `Class already exists: ${classKey} (using existing)`,
          );
        } else {
          // Create new class
          try {
            classId = await ctx.runMutation(api.classes.createClass, {
              courseId,
              bimesterId,
              groupNumber: classData.groupNumber,
              professorId,
              programId,
            });
            result.classesCreated++;
          } catch (error) {
            result.errors.push({
              line: i + 1,
              classKey,
              type: "class_creation_failed",
              message: `Failed to create class: ${error instanceof Error ? error.message : "Unknown error"}`,
              data: { classData },
            });
            continue;
          }
        }

        // 3. Process students for this class
        for (const studentData of classData.students) {
          const studentCode = studentData.studentCode.trim().toUpperCase();
          const studentId = studentsByCode.get(studentCode);

          if (!studentId) {
            result.errors.push({
              line: i + 1,
              classKey,
              studentCode,
              type: "student_not_found",
              message: `Student not found: ${studentCode}`,
              data: { studentCode },
            });
            continue;
          }

          // Validate grade
          if (
            typeof studentData.percentageGrade !== "number" ||
            isNaN(studentData.percentageGrade) ||
            studentData.percentageGrade < 0 ||
            studentData.percentageGrade > 100
          ) {
            result.errors.push({
              line: i + 1,
              classKey,
              studentCode,
              type: "invalid_grade",
              message: `Invalid grade for student ${studentCode}: ${studentData.percentageGrade}`,
              data: { studentCode, grade: studentData.percentageGrade },
            });
            continue;
          }

          try {
            // Check if enrollment already exists
            const existingEnrollments = await ctx.runQuery(
              api.classes.getClassEnrollments,
              { classId },
            );

            const existingEnrollment = existingEnrollments.find(
              (e) => e.studentId === studentId,
            );

            if (existingEnrollment) {
              // Update existing enrollment
              await ctx.runMutation(
                api.classes.updateEnrollmentGradeForImport,
                {
                  enrollmentId: existingEnrollment._id,
                  percentageGrade: studentData.percentageGrade,
                },
              );

              await ctx.runMutation(api.classes.updateEnrollmentStatus, {
                enrollmentId: existingEnrollment._id,
                status: "completed",
              });

              result.enrollmentsUpdated++;
            } else {
              // Create new enrollment
              const enrollmentId = await ctx.runMutation(
                api.classes.addStudentToClass,
                {
                  classId,
                  studentId,
                },
              );

              // Update grade
              await ctx.runMutation(
                api.classes.updateEnrollmentGradeForImport,
                {
                  enrollmentId,
                  percentageGrade: studentData.percentageGrade,
                },
              );

              // Update status to completed
              await ctx.runMutation(api.classes.updateEnrollmentStatus, {
                enrollmentId,
                status: "completed",
              });

              result.enrollmentsCreated++;
            }
          } catch (error) {
            result.errors.push({
              line: i + 1,
              classKey,
              studentCode,
              type: "enrollment_failed",
              message: `Failed to enroll student ${studentCode}: ${error instanceof Error ? error.message : "Unknown error"}`,
              data: { studentCode },
            });
          }
        }
      } catch (error) {
        result.errors.push({
          line: i + 1,
          classKey,
          type: "unknown",
          message: `Unexpected error processing class: ${error instanceof Error ? error.message : "Unknown error"}`,
          data: { classData },
        });
      }
    }

    return result;
  },
});
