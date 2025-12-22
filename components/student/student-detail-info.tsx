"use client";

import * as React from "react";
import { useTranslations, useLocale } from "next-intl";
import { Button } from "@/components/ui/button";
import type { Doc } from "@/convex/_generated/dataModel";
import {
  ChevronDown,
  GraduationCap,
  PencilIcon,
  Trash2Icon,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { PolarAngleAxis, RadialBar, RadialBarChart } from "recharts";
import {
  GradientCard,
  GradientCardContent,
  GradientCardDetailGrid,
  GradientCardDetailItem,
  GradientCardHeader,
} from "@/components/ui/gradient-card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type {
  StudentDocument,
  StudentGradeStats,
  CreditsByCategory,
} from "@/lib/students/types";
import { ROUTES } from "@/lib/routes";

const chartConfig = {
  approved: {
    label: "Approved",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig;

const categoryColors = {
  humanities: "#f97316",
  core: "#22c55e",
  elective: "#3b82f6",
  dmp: "#a855f7",
} as const;

function CreditsProgressChart({
  approved,
  total,
  color = "#22c55e",
  size = "normal",
  label,
}: {
  approved: number;
  total: number;
  color?: string;
  size?: "normal" | "small";
  label?: string;
}) {
  const percentage = total > 0 ? Math.min((approved / total) * 100, 100) : 0;

  const chartData = [{ name: "approved", value: percentage, fill: color }];

  const isSmall = size === "small";
  const containerClass = isSmall ? "h-6 w-6" : "h-8 w-8";
  const innerRadius = isSmall ? 6 : 10;
  const outerRadius = isSmall ? 12 : 16;
  const showTooltip = !!label && isSmall;

  return (
    <ChartContainer config={chartConfig} className={containerClass}>
      <RadialBarChart
        data={chartData}
        startAngle={90}
        endAngle={-270}
        innerRadius={innerRadius}
        outerRadius={outerRadius}
        cx="50%"
        cy="50%"
      >
        <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
        {showTooltip && (
          <ChartTooltip
            cursor={false}
            wrapperStyle={{ zIndex: 1000 }}
            content={
              <ChartTooltipContent
                hideLabel
                formatter={() => (
                  <div className="flex items-center gap-1">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="text-foreground font-mono font-medium tabular-nums">
                      {approved}/{total}
                    </span>
                  </div>
                )}
              />
            }
          />
        )}
        <RadialBar dataKey="value" background cornerRadius={isSmall ? 2 : 4} />
      </RadialBarChart>
    </ChartContainer>
  );
}

function CategoryCreditsPopover({
  approvedByCategory,
  requiredByCategory,
  categoryLabels,
  totalApproved,
  totalRequired,
}: {
  approvedByCategory: CreditsByCategory;
  requiredByCategory: CreditsByCategory;
  categoryLabels: Record<string, string>;
  totalApproved: number;
  totalRequired: number;
}) {
  const [isOpen, setIsOpen] = React.useState(false);

  const categories = [
    { key: "humanities" as const, color: categoryColors.humanities },
    { key: "core" as const, color: categoryColors.core },
    { key: "elective" as const, color: categoryColors.elective },
    { key: "dmp" as const, color: categoryColors.dmp },
  ].filter((cat) => requiredByCategory[cat.key] > 0);

  return (
    <div className="flex items-center gap-1">
      <span>
        {totalApproved}/{totalRequired}
      </span>
      {totalRequired > 0 && (
        <CreditsProgressChart approved={totalApproved} total={totalRequired} />
      )}
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="text-white/70 hover:text-white transition-colors p-0.5 cursor-pointer"
          >
            <ChevronDown
              className={`h-4 w-4 transition-transform duration-200 ${
                isOpen ? "rotate-180" : ""
              }`}
            />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-3" align="start">
          <div className="flex flex-col gap-2">
            {categories.map((cat) => (
              <div
                key={cat.key}
                className="flex items-center justify-between gap-4"
              >
                <span className="text-muted-foreground text-sm">
                  {categoryLabels[cat.key]}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-foreground font-mono text-sm font-medium tabular-nums">
                    {approvedByCategory[cat.key]}/{requiredByCategory[cat.key]}
                  </span>
                  <CreditsProgressChart
                    approved={approvedByCategory[cat.key]}
                    total={requiredByCategory[cat.key]}
                    color={cat.color}
                    size="small"
                  />
                </div>
              </div>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

interface StudentDetailInfoProps {
  student: StudentDocument;
  program?: Doc<"programs"> | null;
  gradeStats?: StudentGradeStats | null;
  onEdit?: () => void;
  onDelete?: () => void;
  canDelete?: boolean;
  userRole?: string | null;
}

export function StudentDetailInfo({
  student,
  program,
  gradeStats,
  onEdit,
  onDelete,
  canDelete = true,
  userRole,
}: StudentDetailInfoProps) {
  const t = useTranslations("admin.students.detail");
  const tTable = useTranslations("admin.students.table");
  const tCategories = useTranslations("admin.courses.form.options.categories");
  const locale = useLocale();

  const categoryLabels = {
    humanities: tCategories("humanities"),
    core: tCategories("core"),
    elective: tCategories("elective"),
    dmp: tCategories("dmp"),
  };

  const fullName = `${student.firstName ?? ""} ${student.lastName ?? ""}`
    .trim()
    .replace(/\s+/g, " ");
  const displayName = fullName || student.email;

  const statusLabel = student.isActive
    ? tTable("status.active")
    : tTable("status.inactive");

  const programName = program
    ? locale === "es"
      ? program.nameEs || program.nameEn || ""
      : program.nameEn || program.nameEs || ""
    : null;

  const actions = (
    <>
      {onEdit && (
        <Button size="sm" onClick={onEdit} className="cursor-pointer">
          <span className="hidden md:inline">{t("edit")}</span>
          <PencilIcon className="h-4 w-4 md:ml-2" />
        </Button>
      )}
      {canDelete && onDelete && (
        <Button
          variant="destructive"
          size="sm"
          onClick={onDelete}
          className="cursor-pointer"
        >
          <span className="hidden md:inline">{t("delete")}</span>
          <Trash2Icon className="h-4 w-4 md:ml-2" />
        </Button>
      )}
    </>
  );

  return (
    <GradientCard>
      <GradientCardHeader
        icon={<UserRound className="size-6" />}
        title={displayName}
        actions={actions}
      />
      <GradientCardContent>
        <GradientCardDetailGrid>
          {/* <GradientCardDetailItem
            label={t("info.fullName")}
            value={displayName}
          /> */}
          <GradientCardDetailItem
            label={t("contact.email")}
            value={student.email ?? "—"}
          />
          <GradientCardDetailItem
            label={t("contact.phone")}
            value={
              student.phone && student.phone.trim() !== "" ? student.phone : "—"
            }
          />
          <GradientCardDetailItem
            label={t("info.status")}
            value={statusLabel}
          />
          <GradientCardDetailItem
            label={t("info.studentCode")}
            value={student.studentProfile?.studentCode ?? "—"}
          />
          <GradientCardDetailItem
            label={t("contact.country")}
            value={
              student.country && student.country.trim() !== ""
                ? student.country
                : "—"
            }
          />
          <GradientCardDetailItem
            label={t("info.program")}
            value={
              programName ? (
                userRole === "student" ? (
                  <span className="inline-flex items-center gap-1 text-white">
                    <GraduationCap className="h-3 w-3" />
                    {programName}
                  </span>
                ) : (
                  <Link
                    href={ROUTES.programs
                      .details(program!._id)
                      .withLocale(locale)}
                    className="inline-flex items-center gap-1 text-white underline decoration-white/60"
                  >
                    <GraduationCap className="h-3 w-3" />
                    {programName}
                  </Link>
                )
              ) : (
                "—"
              )
            }
          />
          {gradeStats && (
            <>
              <GradientCardDetailItem
                label={t("info.approvedCredits")}
                value={
                  program?.type === "bachelor" &&
                  program.creditsByCategory &&
                  gradeStats.approvedCreditsByCategory ? (
                    <CategoryCreditsPopover
                      approvedByCategory={gradeStats.approvedCreditsByCategory}
                      requiredByCategory={program.creditsByCategory}
                      categoryLabels={categoryLabels}
                      totalApproved={gradeStats.approvedCredits}
                      totalRequired={program.totalCredits ?? 0}
                    />
                  ) : (
                    <div className="flex items-center gap-2">
                      <span>
                        {gradeStats.approvedCredits}/
                        {program?.totalCredits ?? "—"}
                      </span>
                      {program?.totalCredits && program.totalCredits > 0 && (
                        <CreditsProgressChart
                          approved={gradeStats.approvedCredits}
                          total={program.totalCredits}
                        />
                      )}
                    </div>
                  )
                }
              />
              <GradientCardDetailItem
                label={t("info.average")}
                value={`${gradeStats.semesterAverage}%`}
              />
            </>
          )}
        </GradientCardDetailGrid>
      </GradientCardContent>
    </GradientCard>
  );
}
