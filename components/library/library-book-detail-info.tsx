"use client";

import * as React from "react";
import {
  BookOpen,
  BookmarkIcon,
  ExternalLink,
  PencilIcon,
  Trash2Icon,
} from "lucide-react";
import { useTranslations } from "next-intl";

import type { LibraryBookDetailRecord } from "@/lib/library/types";
import {
  GradientCard,
  GradientCardContent,
  GradientCardDescriptionBlock,
  GradientCardDescriptions,
  GradientCardDetailGrid,
  GradientCardDetailItem,
  GradientCardHeader,
} from "@/components/ui/gradient-card";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";

function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatDate(value: number, locale: string): string {
  return new Date(value).toLocaleDateString(
    locale === "es" ? "es-ES" : "en-US",
    {
      year: "numeric",
      month: "short",
      day: "numeric",
    },
  );
}

interface LibraryBookDetailInfoProps {
  book: LibraryBookDetailRecord;
  locale: string;
  isFavorite: boolean;
  isFavoriteLoading?: boolean;
  onFavoriteToggle: () => void;
  favoriteOnLabel: string;
  favoriteOffLabel: string;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function LibraryBookDetailInfo({
  book,
  locale,
  isFavorite,
  isFavoriteLoading = false,
  onFavoriteToggle,
  favoriteOnLabel,
  favoriteOffLabel,
  onEdit,
  onDelete,
}: LibraryBookDetailInfoProps) {
  const t = useTranslations("library.detail");
  const [coverVisible, setCoverVisible] = React.useState(
    Boolean(book.coverUrl),
  );
  const extractionWarnings = book.extractionWarnings ?? [];

  const unknownValue = t("unknown");
  const authorsLabel =
    book.authors.length > 0 ? book.authors.join("; ") : unknownValue;
  const publishersLabel =
    book.publishers.length > 0 ? book.publishers.join("; ") : unknownValue;
  const categoriesLabel =
    book.categories.length > 0 ? book.categories.join(", ") : unknownValue;

  const actions = (
    <>
      <Toggle
        aria-label={isFavorite ? favoriteOnLabel : favoriteOffLabel}
        size="sm"
        variant="outline"
        pressed={isFavorite}
        disabled={isFavoriteLoading}
        onPressedChange={onFavoriteToggle}
        className="group/toggle h-8 w-8 shrink-0 p-0"
      >
        <BookmarkIcon className="group-data-[state=on]/toggle:fill-foreground" />
      </Toggle>
      {onEdit && (
        <Button size="sm" onClick={onEdit} className="cursor-pointer">
          <span className="hidden md:inline">{t("edit")}</span>
          <PencilIcon className="h-4 w-4 md:ml-2" />
        </Button>
      )}
      {onDelete && (
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

  const coverContent = (
    <div className="group relative overflow-hidden rounded-md border border-white/20 bg-white/10 shadow-sm">
      <div className="aspect-[2/3] w-full">
        {coverVisible && book.coverUrl ? (
          <img
            src={book.coverUrl}
            alt={book.title}
            className="h-full w-full object-cover"
            loading="lazy"
            onError={() => setCoverVisible(false)}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center p-4 text-center text-sm font-medium text-white/80">
            {book.title}
          </div>
        )}
      </div>
      {book.href && (
        <div className="absolute right-2 top-2 rounded-full bg-black/70 p-1.5 text-white">
          <ExternalLink className="h-3.5 w-3.5" />
        </div>
      )}
    </div>
  );

  return (
    <GradientCard>
      <GradientCardHeader
        icon={<BookOpen className="size-6" />}
        title={book.title}
        actions={actions}
      />
      <GradientCardContent>
        <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
          <div className="space-y-2">
            {book.href ? (
              <a
                href={book.href}
                target="_blank"
                rel="noreferrer"
                aria-label={`${t("openPdf")}: ${book.title}`}
                className="block transition-transform duration-200 hover:scale-[1.01]"
              >
                {coverContent}
              </a>
            ) : (
              coverContent
            )}
            <p className="text-xs text-white/70">
              {book.href ? t("clickCoverToOpen") : t("pdfUnavailable")}
            </p>
          </div>

          <div className="space-y-4">
            <GradientCardDetailGrid className="lg:grid-cols-2 xl:grid-cols-3">
              <GradientCardDetailItem
                label={t("fields.subtitle")}
                value={book.subtitle ?? unknownValue}
              />
              <GradientCardDetailItem
                label={t("fields.authors")}
                value={authorsLabel}
              />
              <GradientCardDetailItem
                label={t("fields.publishers")}
                value={publishersLabel}
              />
              <GradientCardDetailItem
                label={t("fields.publishedYear")}
                value={
                  book.publishedYear ? String(book.publishedYear) : unknownValue
                }
              />
              <GradientCardDetailItem
                label={t("fields.edition")}
                value={book.edition ?? unknownValue}
              />
              <GradientCardDetailItem
                label={t("fields.language")}
                value={
                  book.language ? book.language.toUpperCase() : unknownValue
                }
              />
              <GradientCardDetailItem
                label={t("fields.categories")}
                value={categoriesLabel}
              />
              <GradientCardDetailItem
                label={t("fields.isbn13")}
                value={book.isbn13 ?? unknownValue}
              />
              <GradientCardDetailItem
                label={t("fields.isbn10")}
                value={book.isbn10 ?? unknownValue}
              />
              <GradientCardDetailItem
                label={t("fields.fileSize")}
                value={formatFileSize(book.fileSizeBytes ?? 0)}
              />
              <GradientCardDetailItem
                label={t("fields.createdAt")}
                value={formatDate(book.createdAt, locale)}
              />
              <GradientCardDetailItem
                label={t("fields.updatedAt")}
                value={
                  book.updatedAt
                    ? formatDate(book.updatedAt, locale)
                    : unknownValue
                }
              />
            </GradientCardDetailGrid>

            {extractionWarnings.length > 0 && (
              <div className="rounded-md border border-amber-300/40 bg-amber-200/10 p-3 text-sm text-amber-100">
                <p className="font-semibold">{t("warningsTitle")}</p>
                <ul className="mt-2 space-y-1">
                  {extractionWarnings.map((warning, index) => (
                    <li
                      key={`${book.id}-warning-${index}`}
                      className={cn("list-inside list-disc")}
                    >
                      {warning}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {book.abstract && (
              <GradientCardDescriptions>
                <GradientCardDescriptionBlock
                  label={t("fields.abstract")}
                  content={book.abstract}
                />
              </GradientCardDescriptions>
            )}
          </div>
        </div>
      </GradientCardContent>
    </GradientCard>
  );
}
