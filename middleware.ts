import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";
import { getLocaleFromPathname } from "./lib/locale-setup";
import { checkRoleAccess, resolveRoleFromClaims } from "@/lib/rbac";
import type { UserRole } from "@/convex/types";

const intlMiddleware = createIntlMiddleware(routing);

const isPublicRoute = createRouteMatcher([
  "/:locale/sign-in(.*)",
  "/:locale/sign-up(.*)",
  "/sign-in(.*)",
  "/sign-up(.*)",
]);

const COMMON_AUTHENTICATED_ROUTES = createRouteMatcher([
  "/:locale/profile(.*)",
  "/profile(.*)",
  "/:locale/settings(.*)",
  "/settings(.*)",
  "/:locale/dashboard",
  "/dashboard",
]);

const STATIC_FILE_PATTERN =
  /\.(jpg|jpeg|gif|png|svg|ico|webp|mp4|pdf|js|css|woff2?)$/i;

const DEFAULT_PATHS: Record<UserRole, string> = {
  admin: "/programs",
  superadmin: "/programs",
  professor: "/programs",
  student: "/students",
};

const isLocaleEntryRoute = createRouteMatcher(["/", "/:locale"]);

const getRoleHomePath = (locale: string, role: UserRole) =>
  `/${locale}${DEFAULT_PATHS[role]}`;

export default clerkMiddleware(async (auth, req: NextRequest) => {
  const { pathname, search } = req.nextUrl;

  // Skip static asset requests
  if (STATIC_FILE_PATTERN.test(pathname)) {
    return NextResponse.next();
  }

  const locale = getLocaleFromPathname(pathname);

  if (isPublicRoute(req)) {
    return intlMiddleware(req);
  }

  try {
    const { userId, sessionClaims } = await auth();

    if (!userId) {
      const signInUrl = new URL(`/${locale}/sign-in`, req.url);
      const isInternalPath =
        pathname.startsWith("/") &&
        !pathname.startsWith("//") &&
        !pathname.includes("@");

      if (isInternalPath && pathname !== "/" && pathname !== `/${locale}`) {
        signInUrl.searchParams.set("redirect_url", pathname + search);
      }

      return NextResponse.redirect(signInUrl);
    }

    const userRole = resolveRoleFromClaims(sessionClaims);

    if (!userRole) {
      if (!pathname.includes("/pending-role")) {
        return NextResponse.redirect(
          new URL(`/${locale}/pending-role`, req.url),
        );
      }
      return intlMiddleware(req);
    }

    const roleHomePath = getRoleHomePath(locale, userRole);

    if (isLocaleEntryRoute(req) && !pathname.startsWith(roleHomePath)) {
      return NextResponse.redirect(new URL(roleHomePath, req.url));
    }

    if (COMMON_AUTHENTICATED_ROUTES(req)) {
      return intlMiddleware(req);
    }

    if (checkRoleAccess(req, userRole) === "denied") {
      console.warn(`[Security] Access denied for ${userRole} on ${pathname}`);

      if (!pathname.startsWith(roleHomePath)) {
        return NextResponse.redirect(new URL(roleHomePath, req.url));
      }
    }

    return intlMiddleware(req);
  } catch (error) {
    console.error("[Middleware] Critical error:", error);

    const errorUrl = new URL(`/${locale}/sign-in`, req.url);
    errorUrl.searchParams.set("error", "auth_error");
    return NextResponse.redirect(errorUrl);
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
