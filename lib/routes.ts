type RouteDefinition = {
  path: string;
  withLocale: (locale: string) => string;
};

const normalizePath = (path: string) =>
  path.startsWith("/") ? path : `/${path}`;

const createRoute = (path: string): RouteDefinition => {
  const normalizedPath = normalizePath(path);
  return {
    path: normalizedPath,
    withLocale: (locale: string) => {
      const normalizedLocale = locale.replace(/^\/|\/$/g, "");
      return normalizedLocale
        ? `/${normalizedLocale}${normalizedPath}`
        : normalizedPath;
    },
  };
};

export const ROUTES = {
  // Rutas académicas (estudiantes)
  academic: {
    root: createRoute("/academic"),
    history: createRoute("/academic/history"),
    progress: createRoute("/academic/progress"),
  },
  // Rutas de enseñanza (profesores)
  teaching: {
    root: createRoute("/teaching"),
    gradebook: createRoute("/teaching/gradebook"),
    progress: createRoute("/teaching/progress"),
  },
  // Rutas de gestión (todos los roles, visibilidad controlada por Clerk)
  programs: {
    root: createRoute("/programs"),
    details: (id: string) => createRoute(`/programs/${id}`),
  },
  courses: {
    root: createRoute("/courses"),
    details: (id: string) => createRoute(`/courses/${id}`),
  },
  classes: {
    root: createRoute("/classes"),
    details: (id: string) => createRoute(`/classes/${id}`),
  },
  professors: {
    root: createRoute("/professors"),
    details: (id: string) => createRoute(`/professors/${id}`),
  },
  students: {
    root: createRoute("/students"),
    details: (id: string) => createRoute(`/students/${id}`),
  },
  enrollments: {
    root: createRoute("/enrollments"),
    details: (id: string) => createRoute(`/enrollments/${id}`),
  },
  // Configuración
  settings: {
    root: createRoute("/settings"),
    account: createRoute("/settings/account"),
    accountCustomization: createRoute("/settings/account/customization"),
  },
  // Documentación
  docs: {
    root: createRoute("/docs"),
    transcripts: createRoute("/docs/transcripts"),
    progressGuide: createRoute("/docs/progress"),
    teachingRoot: createRoute("/docs/teaching"),
    teachingGrading: createRoute("/docs/teaching/grading"),
    teachingResources: createRoute("/docs/teaching/resources"),
    managementRoot: createRoute("/docs/management"),
    managementManual: createRoute("/docs/management/manual"),
    managementGuides: createRoute("/docs/management/guides"),
  },
} as const;

export type SidebarRouteGroupKey =
  | "student"
  | "studentDocs"
  | "professor"
  | "professorDocs"
  | "adminAcademic"
  | "adminPersonal"
  | "adminDocs";

type RouteGroup = {
  base: RouteDefinition;
  items: RouteDefinition[];
};

export const SIDEBAR_ROUTE_GROUPS: Record<SidebarRouteGroupKey, RouteGroup> = {
  student: {
    base: ROUTES.academic.root,
    items: [ROUTES.academic.history, ROUTES.academic.progress],
  },
  studentDocs: {
    base: ROUTES.docs.root,
    items: [ROUTES.docs.transcripts, ROUTES.docs.progressGuide],
  },
  professor: {
    base: ROUTES.teaching.root,
    items: [ROUTES.teaching.gradebook, ROUTES.teaching.progress],
  },
  professorDocs: {
    base: ROUTES.docs.teachingRoot,
    items: [ROUTES.docs.teachingGrading, ROUTES.docs.teachingResources],
  },
  adminAcademic: {
    base: ROUTES.programs.root,
    items: [ROUTES.programs.root, ROUTES.courses.root],
  },
  adminPersonal: {
    base: ROUTES.professors.root,
    items: [ROUTES.professors.root, ROUTES.students.root],
  },
  adminDocs: {
    base: ROUTES.docs.managementRoot,
    items: [ROUTES.docs.managementManual, ROUTES.docs.managementGuides],
  },
};

export type { RouteDefinition };
