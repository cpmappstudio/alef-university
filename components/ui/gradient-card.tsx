"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface GradientCardProps {
  children?: React.ReactNode;
  className?: string;
}

interface GradientCardHeaderProps {
  children?: React.ReactNode;
  className?: string;
  title?: React.ReactNode;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
}

interface GradientCardContentProps {
  children?: React.ReactNode;
  className?: string;
}

interface GradientCardDetailItemProps {
  label: string;
  value: string;
}

/**
 * Root GradientCard component with gradient background
 */
export function GradientCard({ children, className }: GradientCardProps) {
  return (
    <Card
      className={cn(
        "overflow-hidden bg-[radial-gradient(circle_at_top_right,_var(--color-fuzzy-wuzzy)_0%,_var(--color-deep-koamaru)_50%)] text-white border-0 shadow-lg",
        className,
      )}
    >
      {children}
    </Card>
  );
}

/**
 * GradientCard Header with optional title, icon, and actions
 */
export function GradientCardHeader({
  children,
  className,
  title,
  icon,
  actions,
}: GradientCardHeaderProps) {
  if (children) {
    return <CardHeader className={cn("pb-4", className)}>{children}</CardHeader>;
  }

  return (
    <CardHeader className={cn("pb-4", className)}>
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        {/* Title with optional icon */}
        {(title || icon) && (
          <CardTitle className="flex items-center gap-3 text-xl mb-2">
            {icon && <span className="flex-shrink-0">{icon}</span>}
            {title && <span className="truncate text-pretty">{title}</span>}
          </CardTitle>
        )}

        {/* Action Buttons */}
        {actions && <CardAction className="flex gap-2">{actions}</CardAction>}
      </div>
    </CardHeader>
  );
}

/**
 * GradientCard Content
 */
export function GradientCardContent({
  children,
  className,
}: GradientCardContentProps) {
  return <CardContent className={cn("pt-0", className)}>{children}</CardContent>;
}

/**
 * Individual detail item component for grid layout
 */
export function GradientCardDetailItem({
  label,
  value,
}: GradientCardDetailItemProps) {
  return (
    <div>
      <div className="text-sm font-medium text-white/70">{label}</div>
      <div className="text-base font-semibold">{value}</div>
    </div>
  );
}

/**
 * Grid container for detail items
 */
export function GradientCardDetailGrid({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
        className,
      )}
    >
      {children}
    </div>
  );
}

/**
 * Descriptions section with border top
 */
export function GradientCardDescriptions({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mt-6 pt-6 border-t border-white/20 space-y-4", className)}>
      {children}
    </div>
  );
}

/**
 * Individual description block
 */
export function GradientCardDescriptionBlock({
  label,
  content,
}: {
  label: string;
  content: string;
}) {
  return (
    <div>
      <div className="text-sm font-medium text-white/70 mb-1">{label}</div>
      <div className="text-sm leading-relaxed">{content}</div>
    </div>
  );
}
