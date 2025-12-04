"use client";

import * as React from "react";
import { ExternalLink } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import packageJson from "@/package.json";

// Changelog data - update this when releasing new versions
const CHANGELOG: ChangelogEntry[] = [
    {
        version: "2.0.0-alpha.4",
        date: "2025-12-04",
        milestoneUrl: "https://github.com/cpmappstudio/alef-university/milestone/2",
        changes: {
            es: [
                "Aumentar la letra en el PDF de calificaciones",
                "Calcular el promedio de calificaciones para estudiantes en PDF",
                "Dashboard de estudiante muestra créditos y calificación promedio",
                "Edición de categorías por curso (cambio de General a DMP)",
                "Créditos no se calculan cuando está reprobado o pendiente por calificar",
            ],
            en: [
                "Increased font size in grades PDF",
                "Calculate grade average for students in PDF",
                "Student dashboard shows credits and average grade",
                "Course category editing (changed General to DMP)",
                "Credits not calculated when failed or pending grading",
            ],
        },
    }
];

interface ChangelogEntry {
    version: string;
    date: string;
    milestoneUrl?: string;
    changes: {
        es: string[];
        en: string[];
    };
}

interface VersionChangelogProps {
    collapsed?: boolean;
}

export function VersionChangelog({ collapsed = false }: VersionChangelogProps) {
    const t = useTranslations("changelog");
    const locale = (typeof window !== "undefined" &&
        document.documentElement.lang) || "es";

    return (
        <Sheet>
            <SheetTrigger asChild>
                <button
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer hover:underline"
                    aria-label={t("viewChangelog")}
                >
                    v{packageJson.version}
                </button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[400px] sm:w-[540px]">
                <SheetHeader>
                    <SheetTitle>{t("title")}</SheetTitle>
                    <SheetDescription>{t("description")}</SheetDescription>
                </SheetHeader>
                <div className="flex-1 overflow-hidden px-4">
                    <ScrollArea className="h-[calc(100vh-180px)]">
                        <div className="space-y-6 pr-4">
                            {CHANGELOG.map((entry) => (
                                <div key={entry.version} className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <h3 className="font-semibold text-lg">
                                            v{entry.version}
                                            {entry.version === packageJson.version && (
                                                <span className="ml-2 text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded">
                                                    {t("current")}
                                                </span>
                                            )}
                                        </h3>
                                        <span className="text-sm text-muted-foreground">
                                            {entry.date}
                                        </span>
                                    </div>
                                    <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                                        {entry.changes[locale as "es" | "en"]?.map(
                                            (change, index) => (
                                                <li key={index}>{change}</li>
                                            ),
                                        ) || entry.changes.es.map((change, index) => (
                                            <li key={index}>{change}</li>
                                        ))}
                                    </ul>
                                    {entry.milestoneUrl && (
                                        <Button
                                            variant="link"
                                            size="sm"
                                            className="h-auto p-0 text-xs"
                                            asChild
                                        >
                                            <a
                                                href={entry.milestoneUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                            >
                                                {t("viewMilestone")}
                                                <ExternalLink className="ml-1 h-3 w-3" />
                                            </a>
                                        </Button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                </div>
            </SheetContent>
        </Sheet>
    );
}
