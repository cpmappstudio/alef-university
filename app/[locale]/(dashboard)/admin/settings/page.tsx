"use client";

import { useTranslations } from "next-intl";
import SettingsItem from "@/components/admin/settings/settings-item";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLocale } from "next-intl";
import Link from "next/link";
import {
  Palette,
  IdCard,
  SlidersHorizontal,
  Users,
  ShieldCheck,
  Layers,
  Calendar,
  GraduationCap,
} from "lucide-react";

interface QuickLink {
  title: string;
  description: string;
  href: string;
  icon: typeof Palette;
}

export default function SettingsPage() {
  const t = useTranslations("admin.settings");
  const tPage = useTranslations("admin.settings.overview");
  const locale = useLocale();

  const quickLinks: QuickLink[] = [
    {
      title: t("sidebar.customization"),
      description: tPage("links.customization"),
      href: `/${locale}/admin/settings/account/customization`,
      icon: Palette,
    },
    {
      title: t("sidebar.profile"),
      description: tPage("links.profile"),
      href: `/${locale}/admin/settings/account/profile`,
      icon: IdCard,
    },
    {
      title: t("sidebar.general"),
      description: tPage("links.general"),
      href: `/${locale}/admin/settings/university/general`,
      icon: SlidersHorizontal,
    },
    {
      title: t("sidebar.members"),
      description: tPage("links.members"),
      href: `/${locale}/admin/settings/university/members`,
      icon: Users,
    },
    {
      title: t("sidebar.roles"),
      description: tPage("links.roles"),
      href: `/${locale}/admin/settings/university/roles`,
      icon: ShieldCheck,
    },
    {
      title: t("sidebar.programs"),
      description: tPage("links.programs"),
      href: `/${locale}/admin/settings/academic-management/programs`,
      icon: Layers,
    },
    {
      title: t("sidebar.bimesters"),
      description: tPage("links.bimesters"),
      href: `/${locale}/admin/settings/academic-management/bimesters`,
      icon: Calendar,
    },
  ];

  return (
    <>
      <SettingsItem title={tPage("title")}>
        <div className="col-span-2 space-y-6">
          <div className="flex flex-col gap-2">
            <h2 className="text-2xl font-semibold tracking-tight">
              {tPage("welcome")}
            </h2>
            <p className="text-sm text-muted-foreground">
              {tPage("description")}
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {quickLinks.map((link) => (
              <Link key={link.href} href={link.href}>
                <Card className="h-full transition-colors hover:bg-muted/50 cursor-pointer">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <link.icon className="h-5 w-5 text-primary" />
                      </div>
                      <CardTitle className="text-base">{link.title}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardDescription>{link.description}</CardDescription>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>

          <div className="rounded-lg border bg-muted/50 p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-lg bg-primary/10">
                <GraduationCap className="h-6 w-6 text-primary" />
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold">{tPage("needHelp.title")}</h3>
                <p className="text-sm text-muted-foreground">
                  {tPage("needHelp.description")}
                </p>
                <Button variant="outline" size="sm" asChild>
                  <a href="#" target="_blank" rel="noopener noreferrer">
                    {tPage("needHelp.button")}
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </SettingsItem>
    </>
  );
}
