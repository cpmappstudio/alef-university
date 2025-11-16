"use client";

import { usePathname } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { useMemo, Fragment, memo, useCallback } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

interface BreadcrumbSegment {
  title: string;
  href?: string;
  isCurrentPage?: boolean;
}

interface RouteConfig {
  title: string;
  parent?: string;
  translationKey?: string;
  fallback?: string;
}

// Flexible route configuration - easily extensible
const ROUTE_CONFIG: Record<string, RouteConfig> = {
  dashboard: { title: "dashboard" },
  academic: { title: "menu.student.title", fallback: "Academic" },
  history: {
    title: "menu.student.items.0.title",
    fallback: "Academic History",
    parent: "academic",
  },
  progress: {
    title: "menu.student.items.1.title",
    fallback: "Academic Progress",
    parent: "academic",
  },
  docs: { title: "studentDocs", fallback: "Documentation" },
  transcripts: {
    title: "menu.studentDocs.items.0.title",
    fallback: "Certificates & Transcripts",
    parent: "docs",
  },
  teaching: { title: "menu.professor.title", fallback: "Teaching" },
  gradebook: {
    title: "menu.professor.items.0.title",
    fallback: "Gradebook",
    parent: "teaching",
  },
  admin: { title: "academicAdmin", fallback: "Administration" },
  programs: {
    title: "menu.adminAcademic.items.0.title",
    fallback: "Program Management",
    parent: "admin",
  },
  courses: {
    title: "menu.adminAcademic.items.1.title",
    fallback: "Course Management",
    parent: "admin",
  },
  periods: {
    title: "menu.adminAcademic.items.2.title",
    fallback: "Period Management",
    parent: "admin",
  },
  users: { title: "personalAdmin", fallback: "User Management" },
  professors: {
    title: "menu.adminPersonal.items.0.title",
    fallback: "Professor Management",
    parent: "users",
  },
  students: {
    title: "menu.adminPersonal.items.1.title",
    fallback: "Student Management",
    parent: "users",
  },
  profile: { title: "profile", fallback: "Profile" },
};

export const DynamicBreadcrumb = memo(function DynamicBreadcrumb() {
  const pathname = usePathname();
  const locale = useLocale();
  const t = useTranslations("navigation");

  // Memoize path processing
  const pathWithoutLocale = useMemo(() => {
    return pathname.replace(/^\/[a-z]{2}(?=\/|$)/, "");
  }, [pathname]);

  // Extract dynamic IDs from pathname
  const pathParts = useMemo(() => {
    return pathWithoutLocale.split("/").filter(Boolean);
  }, [pathWithoutLocale]);

  // Detect dynamic entity IDs
  const programId = useMemo(() => {
    const programsIndex = pathParts.indexOf("programs");
    if (programsIndex !== -1 && pathParts[programsIndex + 1]) {
      const id = pathParts[programsIndex + 1];
      if (!ROUTE_CONFIG[id] && id.length > 20) {
        return id as Id<"programs">;
      }
    }
    return null;
  }, [pathParts]);

  const courseId = useMemo(() => {
    const coursesIndex = pathParts.indexOf("courses");
    if (coursesIndex !== -1 && pathParts[coursesIndex + 1]) {
      const id = pathParts[coursesIndex + 1];
      if (!ROUTE_CONFIG[id] && id.length > 20) {
        return id as Id<"courses">;
      }
    }
    return null;
  }, [pathParts]);

  const classId = useMemo(() => {
    const classesIndex = pathParts.indexOf("classes");
    if (classesIndex !== -1 && pathParts[classesIndex + 1]) {
      const id = pathParts[classesIndex + 1];
      if (!ROUTE_CONFIG[id] && id.length > 20) {
        return id as Id<"classes">;
      }
    }
    return null;
  }, [pathParts]);

  const professorId = useMemo(() => {
    const professorsIndex = pathParts.indexOf("professors");
    if (professorsIndex !== -1 && pathParts[professorsIndex + 1]) {
      const id = pathParts[professorsIndex + 1];
      if (!ROUTE_CONFIG[id] && id.length > 20) {
        // Return as string (Clerk ID)
        return id;
      }
    }
    return null;
  }, [pathParts]);

  const studentId = useMemo(() => {
    const studentsIndex = pathParts.indexOf("students");
    if (studentsIndex !== -1 && pathParts[studentsIndex + 1]) {
      const id = pathParts[studentsIndex + 1];
      if (!ROUTE_CONFIG[id] && id.length > 20) {
        // Return as string (Clerk ID)
        return id;
      }
    }
    return null;
  }, [pathParts]);

  // Fetch data for dynamic entities
  const program = useQuery(
    api.programs.getProgramById,
    programId ? { id: programId } : "skip",
  );

  const course = useQuery(
    api.courses.getCourseById,
    courseId ? { id: courseId } : "skip",
  );

  const classData = useQuery(
    api.classes.getClassById,
    classId ? { id: classId } : "skip",
  );

  const professor = useQuery(
    api.users.getUserByClerkId,
    professorId ? { clerkId: professorId } : "skip",
  );

  const student = useQuery(
    api.users.getUserByClerkId,
    studentId ? { clerkId: studentId } : "skip",
  );

  // Stable translation function with useCallback
  const getTranslation = useCallback(
    (key: string, fallback: string) => {
      try {
        // Handle nested keys like "menu.student.title"
        if (key.includes(".")) {
          const result = t.raw(key as any);
          return result || fallback;
        }
        return t(key as any) || fallback;
      } catch {
        return fallback;
      }
    },
    [t],
  );

  const breadcrumbSegments = useMemo((): BreadcrumbSegment[] => {
    const segments: BreadcrumbSegment[] = [];

    // Handle root/dashboard
    if (!pathWithoutLocale || pathWithoutLocale === "/") {
      segments.push({
        title: getTranslation("dashboard", "Dashboard"),
        isCurrentPage: true,
      });
      return segments;
    }

    // Build breadcrumb path - only show the last segment (current page)
    const lastPart = pathParts[pathParts.length - 1];

    // If this is a program detail page and we have program data, show program name
    if (programId && program) {
      const nameEs = program.nameEs || "";
      const nameEn = program.nameEn || "";
      const programName = locale === "es" ? nameEs || nameEn : nameEn || nameEs;

      segments.push({
        title: programName || "Program",
        isCurrentPage: true,
      });
      return segments;
    }

    // If this is a course detail page and we have course data, show course name
    if (courseId && course) {
      const nameEs = course.nameEs || "";
      const nameEn = course.nameEn || "";
      const courseName = locale === "es" ? nameEs || nameEn : nameEn || nameEs;

      segments.push({
        title: courseName || "Course",
        isCurrentPage: true,
      });
      return segments;
    }

    // If this is a class detail page and we have class data, show course name + group
    if (classId && classData) {
      const course = classData.course;
      const nameEs = course?.nameEs || "";
      const nameEn = course?.nameEn || "";
      const courseName = locale === "es" ? nameEs || nameEn : nameEn || nameEs;
      const groupNumber = classData.groupNumber;
      const groupLabel = locale === "es" ? "Grupo" : "Group";

      segments.push({
        title: `${courseName} - ${groupLabel} ${groupNumber}`,
        isCurrentPage: true,
      });
      return segments;
    }

    // Professor detail page: prefix with "Prof." + full name
    if (professorId && professor) {
      const fullName = [professor.firstName, professor.lastName]
        .filter(Boolean)
        .join(" ")
        .trim();
      const displayName = fullName || professor.email || professor.clerkId;
      const prefix = locale === "es" ? "Prof." : "Prof.";

      segments.push({
        title: `${prefix} ${displayName}`.trim(),
        isCurrentPage: true,
      });
      return segments;
    }

    if (studentId && student) {
      const fullName = [student.firstName, student.lastName]
        .filter(Boolean)
        .join(" ")
        .trim();
      const displayName = fullName || student.email || student.clerkId;
      const prefix = locale === "es" ? "Est." : "Student";

      segments.push({
        title: `${prefix} ${displayName}`.trim(),
        isCurrentPage: true,
      });
      return segments;
    }

    // Otherwise, use standard route config
    const config = ROUTE_CONFIG[lastPart];
    const title = config
      ? getTranslation(config.title, config.fallback || config.title)
      : lastPart.charAt(0).toUpperCase() + lastPart.slice(1);

    segments.push({
      title,
      isCurrentPage: true,
    });

    return segments;
  }, [
    pathWithoutLocale,
    pathParts,
    getTranslation,
    programId,
    program,
    courseId,
    course,
    classId,
    classData,
    locale,
    professorId,
    professor,
    studentId,
    student,
  ]);

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {breadcrumbSegments.map((segment, index) => (
          <Fragment key={index}>
            {index > 0 && <BreadcrumbSeparator />}
            <BreadcrumbItem>
              {segment.isCurrentPage ? (
                <BreadcrumbPage className="font-bold text-muted-foreground">
                  {segment.title}
                </BreadcrumbPage>
              ) : (
                <BreadcrumbLink href={segment.href || "#"}>
                  {segment.title}
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
          </Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
});
