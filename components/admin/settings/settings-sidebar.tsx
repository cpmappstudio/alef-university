"use client";

import * as React from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  ChevronDown,
  ChevronRight,
  UserCog,
  Palette,
  IdCard,
  Building2,
  SlidersHorizontal,
  Users,
  ShieldCheck,
  GraduationCap,
  Layers,
  Menu,
} from "lucide-react";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type SectionItem = {
  id: string;
  label: string;
  href: string;
  icon?: LucideIcon;
  aliases?: string[];
};

type Section = {
  id: string;
  label: string;
  items: SectionItem[];
  defaultOpen?: boolean;
  icon?: LucideIcon;
};

function normalizePath(path: string) {
  return path.endsWith("/") && path !== "/" ? path.slice(0, -1) : path;
}

export function SettingsSidebar() {
  const locale = useLocale();
  const pathname = usePathname();
  const t = useTranslations("admin.settings.sidebar");

  const basePath = React.useMemo(
    () => normalizePath(`/${locale}/admin/settings`),
    [locale],
  );
  const normalizedPath = normalizePath(pathname);

  const accountLabel = t("account", { defaultMessage: "Account" });
  const customizationLabel = t("customization", {
    defaultMessage: "Customization",
  });
  const profileLabel = t("profile", { defaultMessage: "Profile" });
  const universityLabel = t("university", { defaultMessage: "University" });
  const generalLabel = t("general", { defaultMessage: "General" });
  const membersLabel = t("members", { defaultMessage: "Members" });
  const rolesLabel = t("roles", { defaultMessage: "Roles" });
  const academicManagementLabel = t("academicManagement", {
    defaultMessage: "Academic Management",
  });
  const programsLabel = t("programs", { defaultMessage: "Programs" });

  const sections = React.useMemo<Section[]>(
    () => [
      {
        id: "account",
        label: accountLabel,
        icon: UserCog,
        defaultOpen: true,
        items: [
          {
            id: "customization",
            label: customizationLabel,
            href: `${basePath}/account/customization`,
            icon: Palette,
          },
          {
            id: "profile",
            label: profileLabel,
            href: `${basePath}/account/profile`,
            icon: IdCard,
            aliases: [`${basePath}/profile`],
          },
        ],
      },
      {
        id: "university",
        label: universityLabel,
        icon: Building2,
        items: [
          {
            id: "general",
            label: generalLabel,
            href: `${basePath}/university/general`,
            icon: SlidersHorizontal,
            aliases: [`${basePath}/general`],
          },
          {
            id: "members",
            label: membersLabel,
            href: `${basePath}/university/members`,
            icon: Users,
            aliases: [`${basePath}/members`],
          },
          {
            id: "roles",
            label: rolesLabel,
            href: `${basePath}/university/roles`,
            icon: ShieldCheck,
            aliases: [`${basePath}/roles`],
          },
        ],
      },
      {
        id: "academic-management",
        label: academicManagementLabel,
        icon: GraduationCap,
        items: [
          {
            id: "programs",
            label: programsLabel,
            href: `${basePath}/academic-management/programs`,
            icon: Layers,
            aliases: [`${basePath}/programs`],
          },
        ],
      },
    ],
    [
      accountLabel,
      academicManagementLabel,
      basePath,
      customizationLabel,
      generalLabel,
      membersLabel,
      profileLabel,
      programsLabel,
      rolesLabel,
      universityLabel,
    ],
  );

  const isItemActive = React.useCallback(
    (item: SectionItem) => {
      const normalizedHref = normalizePath(item.href);

      // Exact match or path starts with the item's href
      if (normalizedPath === normalizedHref) {
        return true;
      }

      // Check if it's a sub-path (but not just the base path)
      if (normalizedPath.startsWith(`${normalizedHref}/`)) {
        return true;
      }

      return false;
    },
    [normalizedPath],
  );

  // Desktop sidebar
  const desktopSidebar = (
    <div className="hidden md:flex w-full flex-col gap-2 ">
      {sections.map((section) => (
        <Collapsible key={section.id} defaultOpen={true}>
          <div className="flex items-center justify-between">
            <CollapsibleTrigger className="flex w-full items-center justify-between gap-2 py-2 text-sm font-semibold hover:underline">
              <div className="flex items-center gap-2">
                {section.icon && <section.icon className="h-4 w-4" />}
                {section.label}
              </div>
              <ChevronDown className="h-4 w-4 transition-transform duration-200 data-[state=open]:rotate-180" />
            </CollapsibleTrigger>
          </div>
          <CollapsibleContent className="flex flex-col gap-1 pl-6 pt-1">
            {section.items.map((item) => {
              const isActive = isItemActive(item);
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2 py-1.5 text-sm transition-colors hover:text-foreground",
                    isActive
                      ? "font-medium text-foreground"
                      : "text-muted-foreground",
                  )}
                >
                  {item.icon && <item.icon className="h-4 w-4" />}
                  {item.label}
                </Link>
              );
            })}
          </CollapsibleContent>
        </Collapsible>
      ))}
    </div>
  );

  // Mobile dropdown
  const mobileDropdown = (
    <div className="md:hidden md:px-4 pt-4 md:pt-0">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="w-full justify-between">
            <span className="flex items-center gap-2">
              <Menu className="h-4 w-4" />
              Settings Menu
            </span>
            <ChevronDown className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="start">
          {sections.map((section, sectionIndex) => (
            <React.Fragment key={section.id}>
              {sectionIndex > 0 && <DropdownMenuSeparator />}
              <DropdownMenuLabel className="flex items-center gap-2 text-xs">
                {section.icon && <section.icon className="h-3 w-3" />}
                {section.label}
              </DropdownMenuLabel>
              <DropdownMenuGroup>
                {section.items.map((item) => {
                  const isActive = isItemActive(item);
                  return (
                    <DropdownMenuItem key={item.id} asChild>
                      <Link
                        href={item.href}
                        className={cn(
                          "flex items-center gap-2 cursor-pointer",
                          isActive && "font-medium",
                        )}
                      >
                        {item.icon && <item.icon className="h-4 w-4" />}
                        {item.label}
                      </Link>
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuGroup>
            </React.Fragment>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );

  return (
    <>
      {desktopSidebar}
      {mobileDropdown}
    </>
  );
}
