import { auth, createRouteMatcher } from "@clerk/nextjs/server";
import type { NextRequest } from "next/server";
import type { UserRole } from "@/convex/types";

const KNOWN_ROLES = ["student", "professor", "admin", "superadmin"] as const;
const ADMIN_ROLES = ["admin", "superadmin"] as const;
const PROFESSOR_ROLES = ["professor", "admin", "superadmin"] as const;

type RouteRestriction = {
  matcher: ReturnType<typeof createRouteMatcher>;
  allowedRoles: readonly UserRole[];
};

// Routes that must stay hidden from students.
const ROUTE_RESTRICTIONS: RouteRestriction[] = [
  {
    matcher: createRouteMatcher(["/:locale/programs", "/programs"]),
    allowedRoles: PROFESSOR_ROLES,
  },
  {
    matcher: createRouteMatcher(["/:locale/courses", "/courses"]),
    allowedRoles: PROFESSOR_ROLES,
  },
  {
    matcher: createRouteMatcher(["/:locale/classes", "/classes"]),
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
 * @returns 'allowed' | 'denied'
 */
export function checkRoleAccess(
  req: NextRequest,
  userRole: UserRole,
): "allowed" | "denied" {
  for (const restriction of ROUTE_RESTRICTIONS) {
    if (restriction.matcher(req)) {
      return restriction.allowedRoles.includes(userRole) ? "allowed" : "denied";
    }
  }

  return "allowed";
}
