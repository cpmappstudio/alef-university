"use client";

import * as React from "react";
import Link from "next/link";
import { useLocale } from "next-intl";

import type { LibraryBookRecord } from "@/lib/library/types";
import { ROUTES } from "@/lib/routes";

type BookCardProps = {
  book: LibraryBookRecord;
  statusLabel: string;
  languageLabel?: string;
  unknownAuthorLabel: string;
  openBookLabel: string;
};

export function BookCard({
  book,
  statusLabel,
  languageLabel,
  unknownAuthorLabel,
  openBookLabel,
}: BookCardProps) {
  const locale = useLocale();
  const [coverVisible, setCoverVisible] = React.useState(
    Boolean(book.coverUrl),
  );

  const authorLabel =
    book.authors.length > 0 ? book.authors.join("; ") : unknownAuthorLabel;

  const cardBody = (
    <>
      <Link
        href={ROUTES.library.details(book.id).withLocale(locale)}
        aria-label={`${openBookLabel}: ${book.title}`}
        className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <div className="relative overflow-hidden rounded-md border bg-muted/40 shadow-sm transition-transform duration-200 group-hover:scale-[1.01]">
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
              <div className="flex h-full w-full items-center justify-center p-4 text-center text-sm font-medium text-muted-foreground">
                {book.title}
              </div>
            )}
          </div>
          <span className="absolute left-2 top-2 rounded bg-black/70 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-white">
            {statusLabel}
          </span>
        </div>
      </Link>

      <div className="mt-2 space-y-1">
        <Link
          href={ROUTES.library.details(book.id).withLocale(locale)}
          aria-label={`${openBookLabel}: ${book.title}`}
          className="block"
        >
          <h3 className="line-clamp-2 text-sm font-semibold leading-tight text-foreground">
            {book.title}
          </h3>
        </Link>
        <p className="line-clamp-2 text-sm text-muted-foreground">
          {authorLabel}
        </p>
        <p className="line-clamp-1 text-xs text-muted-foreground">
          {book.publishedYear ? `${book.publishedYear}` : ""}
          {book.publishedYear && languageLabel ? " • " : ""}
          {languageLabel ?? ""}
        </p>
      </div>
    </>
  );

  return <article className="group">{cardBody}</article>;
}
