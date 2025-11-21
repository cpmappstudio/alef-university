"use client";

import * as React from "react";
import Link from "next/link";
import {
  BookOpen,
  User,
  GraduationCap,
  Settings,
  UserCog,
  FileText,
  Home,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { useUser } from "@clerk/nextjs";

import { NavMain } from "@/components/ui/nav-main";
import { UniversityLogo } from "@/components/ui/university-logo";
import { ROUTES, SIDEBAR_ROUTE_GROUPS } from "@/lib/routes";
import { cn } from "@/lib/utils";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import { UserButtonWrapper } from "./user-button-wrapper";
import type { UserRole } from "@/convex/types";
import packageJson from "@/package.json";

type NavigationMenuSection = {
  title: string;
  url?: string;
  items?: Array<{ title: string; url?: string }>;
};

type NavigationMenuConfig = Partial<Record<string, NavigationMenuSection>>;

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { state } = useSidebar();
  const { user } = useUser();
  const locale = useLocale();
  const pathname = usePathname();
  const t = useTranslations("navigation");
  const settingsHref = ROUTES.settings.accountCustomization.withLocale(locale);
  const isSettingsActive = pathname.startsWith(
    ROUTES.settings.root.withLocale(locale),
  );

  // Get user role and ID from Clerk
  const userRole = user?.publicMetadata?.role as UserRole | undefined;
  const userId = user?.id;

  // Configuración de íconos para cada tipo de menú
  const iconMap = {
    profile: User,
    student: BookOpen,
    studentDocs: FileText,
    professor: GraduationCap,
    professorDocs: FileText,
    adminAcademic: Settings,
    adminPersonal: UserCog,
    adminDocs: FileText,
  } as const;

  // Generar estructura de navegación basada en el rol del usuario
  const navItems = React.useMemo(() => {
    const menuConfig = t.raw("menu") as NavigationMenuConfig;

    const buildSection = (
      sectionKey: keyof typeof SIDEBAR_ROUTE_GROUPS,
      iconKey: keyof typeof iconMap,
      options?: { isActive?: boolean; excludeProgress?: boolean },
    ) => {
      const sectionRoutes = SIDEBAR_ROUTE_GROUPS[sectionKey];
      const translationSection = menuConfig[sectionKey];

      const labeledItems = sectionRoutes.items.map((route, index) => ({
        route,
        title:
          translationSection?.items?.[index]?.title ??
          translationSection?.title ??
          route.path,
      }));

      const filteredItems = options?.excludeProgress
        ? labeledItems.filter(({ route }) => !route.path.includes("/progress"))
        : labeledItems;

      return {
        title: translationSection?.title ?? sectionKey,
        url: sectionRoutes.base.withLocale(locale),
        icon: iconMap[iconKey],
        isActive: options?.isActive ?? true,
        items: filteredItems.map(({ route, title }) => ({
          title,
          url: route.withLocale(locale),
        })),
      };
    };

    const items: React.ComponentProps<typeof NavMain>["items"] = [];

    // Eliminar "Mi Cuenta" para todos los roles
    // Menús específicos por rol
    if (userRole === "student") {
      // For students: only show Home link to their profile
      if (userId) {
        items.push({
          title: t("home") || "Home",
          url: ROUTES.students.details(userId).withLocale(locale),
          icon: Home,
          isActive: true,
          items: [],
        });
      }
    }

    if (userRole === "professor") {
      // For professors: only show Home link to their profile
      if (userId) {
        items.push({
          title: t("home") || "Home",
          url: ROUTES.professors.details(userId).withLocale(locale),
          icon: Home,
          isActive: true,
          items: [],
        });
      }
    }

    if (userRole === "admin" || userRole === "superadmin") {
      // Administración Académica
      if (menuConfig.adminAcademic) {
        items.push(
          buildSection("adminAcademic", "adminAcademic", {
            isActive: true,
            excludeProgress: true,
          }),
        );
      }

      // Administración Personal
      if (menuConfig.adminPersonal) {
        items.push(
          buildSection("adminPersonal", "adminPersonal", {
            excludeProgress: true,
          }),
        );
      }

      // Documentación para administradores - OCULTO
      // if (menuConfig.adminDocs) {
      //   items.push({
      //     title: menuConfig.adminDocs.title,
      //     url: menuConfig.adminDocs.url,
      //     icon: iconMap.adminDocs,
      //     isActive: false,
      //     items: menuConfig.adminDocs.items.map(item => ({
      //       title: item.title,
      //       url: item.url,
      //     })),
      //   })
      // }
    }

    return items;
  }, [t, userRole]);

  return (
    <Sidebar
      collapsible="icon"
      {...props}
      className="wrap-anywhere overflow-hidden"
    >
      <SidebarHeader>
        <UserButtonWrapper
          showName={state !== "collapsed"}
          collapsed={state === "collapsed"}
        />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navItems} navigationLabel={t("navigation")} />
      </SidebarContent>
      <SidebarFooter>
        <Link
          href={settingsHref}
          className={cn(
            "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
            isSettingsActive &&
              "bg-sidebar-accent text-sidebar-accent-foreground",
            state === "collapsed" && "justify-center px-0",
          )}
          aria-label={t("settings")}
          aria-current={isSettingsActive ? "page" : undefined}
        >
          <Settings className="h-4 w-4" />
          {state !== "collapsed" && <span>{t("settings")}</span>}
        </Link>
        <UniversityLogo />
        {state !== "collapsed" && (
          <div className="px-2 py-1 text-center">
            <span className="text-xs text-muted-foreground">
              v{packageJson.version}
            </span>
          </div>
        )}
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
