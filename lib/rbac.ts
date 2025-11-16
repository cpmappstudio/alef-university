import { auth, createRouteMatcher } from "@clerk/nextjs/server";
import type { NextRequest } from "next/server";
import type { UserRole } from "@/convex/types";
import { ROUTES } from "@/lib/routes";

const KNOWN_ROLES = ["student", "professor", "admin", "superadmin"] as const;
const ADMIN_ROLES = ["admin", "superadmin"] as const;
const PROFESSOR_ROLES = ["professor", "admin", "superadmin"] as const;

type RouteRestriction = {
  matcher: ReturnType<typeof createRouteMatcher>;
  allowedRoles: readonly UserRole[];
};

// Routes accessible only to students (their own profile)
const STUDENT_ALLOWED_ROUTES = createRouteMatcher([
  "/:locale" + ROUTES.students.root.path + "/:studentId",
  ROUTES.students.root.path + "/:studentId",
  "/:locale" + ROUTES.settings.root.path + "(.*)",
  ROUTES.settings.root.path + "(.*)",
]);

// Routes that must stay hidden from students.
const ROUTE_RESTRICTIONS: RouteRestriction[] = [
  {
    matcher: createRouteMatcher([
      "/:locale" + ROUTES.settings.academicManagementPrograms.path,
      ROUTES.settings.academicManagementPrograms.path,
      "/:locale" + ROUTES.settings.academicManagementCourses.path,
      ROUTES.settings.academicManagementCourses.path,
    ]),
    allowedRoles: ADMIN_ROLES,
  },
  {
    matcher: createRouteMatcher([
      "/:locale" + ROUTES.programs.root.path,
      ROUTES.programs.root.path,
    ]),
    allowedRoles: PROFESSOR_ROLES,
  },
  {
    matcher: createRouteMatcher([
      "/:locale" + ROUTES.courses.root.path,
      ROUTES.courses.root.path,
    ]),
    allowedRoles: PROFESSOR_ROLES,
  },
  {
    matcher: createRouteMatcher([
      "/:locale" + ROUTES.classes.root.path,
      ROUTES.classes.root.path,
    ]),
    allowedRoles: PROFESSOR_ROLES,
  },
  {
    matcher: createRouteMatcher([
      "/:locale" + ROUTES.professors.root.path,
      ROUTES.professors.root.path,
    ]),
    allowedRoles: PROFESSOR_ROLES,
  },
  {
    matcher: createRouteMatcher([
      "/:locale" + ROUTES.enrollments.root.path,
      ROUTES.enrollments.root.path,
    ]),
    allowedRoles: PROFESSOR_ROLES,
  },
  {
    matcher: createRouteMatcher([
      "/:locale" + ROUTES.students.root.path,
      ROUTES.students.root.path,
    ]),
    allowedRoles: PROFESSOR_ROLES,
  },
];

const asUserRole = (value: unknown): UserRole | null => {
  if (
    typeof value === "string" &&
    (KNOWN_ROLES as readonly string[]).includes(value)
  ) {
    return value as UserRole;
  }
  return null;
};

export function resolveRoleFromClaims(
  claims: Record<string, unknown> | null | undefined,
): UserRole | null {
  if (!claims) return null;

  const typedClaims = claims as Record<string, any>;

  return (
    asUserRole(typedClaims.orgRole) ??
    asUserRole(typedClaims.publicMetadata?.role) ??
    asUserRole(typedClaims.privateMetadata?.role) ??
    asUserRole(typedClaims.metadata?.role) ??
    null
  );
}

/**
 * Get current user role from Clerk session claims
 */
export async function getCurrentUserRole(): Promise<UserRole | null> {
  try {
    const { sessionClaims } = await auth();
    return resolveRoleFromClaims(sessionClaims);
  } catch (error) {
    console.error("Error getting user role:", error);
    return null;
  }
}

/**
 * Check if user has any of the required roles
 */
export function hasRole(
  userRole: UserRole | null,
  requiredRoles: readonly UserRole[],
): boolean {
  return userRole ? requiredRoles.includes(userRole) : false;
}

/**
 * Check if user can access admin features
 */
export function canAccessAdmin(userRole: UserRole | null): boolean {
  return hasRole(userRole, ADMIN_ROLES);
}

/**
 * Check if user can access professor features
 */
export function canAccessProfessor(userRole: UserRole | null): boolean {
  return hasRole(userRole, PROFESSOR_ROLES);
}

/**
 * Check if user is a student
 */
export function isStudent(userRole: UserRole | null): boolean {
  return userRole === "student";
}

/**
 * Verifica acceso por rol en el contexto del middleware
 * @returns 'allowed' | 'denied' | 'wrong-student'
 */
export function checkRoleAccess(
  req: NextRequest,
  userRole: UserRole,
  userId?: string,
): "allowed" | "denied" | "wrong-student" {
  // Students can ONLY access their own profile and account settings (not academic management)
  if (userRole === "student") {
    // Allow only account settings routes for students
    if (
      req.nextUrl.pathname.includes(
        ROUTES.settings.accountCustomization.path,
      ) ||
      req.nextUrl.pathname.includes(ROUTES.settings.accountProfile.path) ||
      req.nextUrl.pathname.includes(ROUTES.settings.profile.path)
    ) {
      return "allowed";
    }

    // Deny access to academic management settings
    if (req.nextUrl.pathname.includes(ROUTES.settings.root.path)) {
      return "denied";
    }

    // Check if accessing a student profile route
    if (STUDENT_ALLOWED_ROUTES(req)) {
      // Extract studentId from URL
      const pathParts = req.nextUrl.pathname.split("/");
      const studentsIndex = pathParts.indexOf("students");

      if (studentsIndex !== -1 && pathParts[studentsIndex + 1]) {
        const studentIdFromUrl = pathParts[studentsIndex + 1];

        // Students can only access their own profile
        if (studentIdFromUrl === userId) {
          return "allowed";
        }
        return "wrong-student";
      }
    }

    // Students can't access any other routes
    return "denied";
  }

  // For professors: allow account settings, deny academic management
  if (userRole === "professor") {
    // Allow only account settings routes for professors
    if (
      req.nextUrl.pathname.includes(
        ROUTES.settings.accountCustomization.path,
      ) ||
      req.nextUrl.pathname.includes(ROUTES.settings.accountProfile.path) ||
      req.nextUrl.pathname.includes(ROUTES.settings.profile.path)
    ) {
      return "allowed";
    }

    // Deny access to academic management settings
    if (req.nextUrl.pathname.includes(ROUTES.settings.root.path)) {
      return "denied";
    }
  }

  // For all roles, check route restrictions
  for (const restriction of ROUTE_RESTRICTIONS) {
    if (restriction.matcher(req)) {
      return restriction.allowedRoles.includes(userRole) ? "allowed" : "denied";
    }
  }

  return "allowed";
}
