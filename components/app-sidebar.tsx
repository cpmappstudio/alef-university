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
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { useUser } from "@clerk/nextjs";

import { NavMain } from "@/components/nav-main";
import { UniversityLogo } from "@/components/university-logo";
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

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { state } = useSidebar();
  const { user } = useUser();
  const locale = useLocale();
  const pathname = usePathname();
  const t = useTranslations("navigation");
  const settingsHref = `/${locale}/admin/settings/account/customization`;
  const isSettingsActive = pathname.startsWith(`/${locale}/admin/settings`);

  // Get user role from Clerk metadata
  const userRole = user?.publicMetadata?.role as UserRole | undefined;

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
    const menuConfig = t.raw("menu") as Record<
      string,
      {
        title: string;
        url: string;
        items: Array<{ title: string; url: string }>;
      }
    >;

    const items = [];

    // Eliminar "Mi Cuenta" para todos los roles
    // Menús específicos por rol
    if (userRole === "student") {
      // Mi Estudio
      if (menuConfig.student) {
        items.push({
          title: menuConfig.student.title,
          url: menuConfig.student.url,
          icon: iconMap.student,
          isActive: true, // Dashboard activo por defecto
          items: menuConfig.student.items
            .filter((item) => !item.url.includes("/progress")) // Ocultar enlaces de progress
            .map((item) => ({
              title: item.title,
              url: item.url,
            })),
        });
      }

      // Documentación para estudiantes - OCULTO
      // if (menuConfig.studentDocs) {
      //   items.push({
      //     title: menuConfig.studentDocs.title,
      //     url: menuConfig.studentDocs.url,
      //     icon: iconMap.studentDocs,
      //     isActive: false,
      //     items: menuConfig.studentDocs.items.map(item => ({
      //       title: item.title,
      //       url: item.url,
      //     })),
      //   })
      // }
    }

    if (userRole === "professor") {
      // Mis Clases
      if (menuConfig.professor) {
        items.push({
          title: menuConfig.professor.title,
          url: menuConfig.professor.url,
          icon: iconMap.professor,
          isActive: true,
          items: menuConfig.professor.items
            .filter((item) => !item.url.includes("/progress")) // Ocultar enlaces de progress
            .map((item) => ({
              title: item.title,
              url: item.url,
            })),
        });
      }

      // Documentación para profesores - OCULTO
      // if (menuConfig.professorDocs) {
      //   items.push({
      //     title: menuConfig.professorDocs.title,
      //     url: menuConfig.professorDocs.url,
      //     icon: iconMap.professorDocs,
      //     isActive: false,
      //     items: menuConfig.professorDocs.items.map(item => ({
      //       title: item.title,
      //       url: item.url,
      //     })),
      //   })
      // }
    }

    if (userRole === "admin" || userRole === "superadmin") {
      // Administración Académica
      if (menuConfig.adminAcademic) {
        items.push({
          title: menuConfig.adminAcademic.title,
          url: menuConfig.adminAcademic.url,
          icon: iconMap.adminAcademic,
          isActive: true,
          items: menuConfig.adminAcademic.items
            .filter((item) => !item.url.includes("/progress")) // Ocultar enlaces de progress
            .map((item) => ({
              title: item.title,
              url: item.url,
            })),
        });
      }

      // Administración Personal
      if (menuConfig.adminPersonal) {
        items.push({
          title: menuConfig.adminPersonal.title,
          url: menuConfig.adminPersonal.url,
          icon: iconMap.adminPersonal,
          isActive: false,
          items: menuConfig.adminPersonal.items
            .filter((item) => !item.url.includes("/progress")) // Ocultar enlaces de progress
            .map((item) => ({
              title: item.title,
              url: item.url,
            })),
        });
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
        <NavMain
          items={navItems}
          dashboardLabel={t("dashboard")}
          navigationLabel={t("navigation")}
        />
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
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
