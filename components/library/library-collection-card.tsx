"use client";

import * as React from "react";
import {
  EllipsisVertical,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react";

import type { LibraryCollectionRecord } from "@/lib/library/types";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type LibraryCollectionCardProps = {
  collection: LibraryCollectionRecord;
  onOpen: (collectionId: string) => void;
  canManage?: boolean;
  onEditBooks?: (collection: LibraryCollectionRecord) => void;
  onEdit?: (collection: LibraryCollectionRecord) => void;
  onDelete?: (collection: LibraryCollectionRecord) => void;
  editBooksLabel?: string;
  editLabel?: string;
  deleteLabel?: string;
  manageLabel?: string;
};

export function LibraryCollectionCard({
  collection,
  onOpen,
  canManage = false,
  onEditBooks,
  onEdit,
  onDelete,
  editBooksLabel = "Edit books",
  editLabel = "Edit",
  deleteLabel = "Delete",
  manageLabel = "Manage collection",
}: LibraryCollectionCardProps) {
  const previewBooks = collection.previewBooks.slice(0, 6);

  return (
    <div className="group relative">
      {canManage && (onEditBooks || onEdit || onDelete) && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label={`${manageLabel}: ${collection.name}`}
              className="absolute top-2 right-2 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-border/70 bg-background/90 text-muted-foreground shadow-sm transition-colors hover:text-foreground"
            >
              <EllipsisVertical className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {onEditBooks && (
              <DropdownMenuItem onSelect={() => onEditBooks(collection)}>
                <PlusIcon className="h-4 w-4" />
                {editBooksLabel}
              </DropdownMenuItem>
            )}
            {onEdit && (
              <DropdownMenuItem onSelect={() => onEdit(collection)}>
                <PencilIcon className="h-4 w-4" />
                {editLabel}
              </DropdownMenuItem>
            )}
            {onDelete && (
              <DropdownMenuItem
                variant="destructive"
                onSelect={() => onDelete(collection)}
              >
                <Trash2Icon className="h-4 w-4" />
                {deleteLabel}
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      <button
        type="button"
        onClick={() => onOpen(collection.id)}
        className={cn(
          "flex w-full flex-col items-start text-left",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        )}
      >
        <div className="relative w-full overflow-hidden rounded-2xl border border-border/70 bg-muted/70 p-3 shadow-sm transition-colors duration-200 group-hover:bg-muted/90 dark:bg-white/[0.03] dark:group-hover:bg-white/[0.05]">
          <div className="grid aspect-[1.14/0.86] grid-cols-3 grid-rows-2 gap-2">
            {Array.from({ length: 6 }).map((_, index) => {
              const previewBook = previewBooks[index];

              if (!previewBook) {
                return (
                  <div
                    key={`${collection.id}-placeholder-${index}`}
                    className="h-full min-h-0 rounded-md border border-border/40 bg-background/60 dark:bg-black/10"
                  />
                );
              }

              return (
                <div
                  key={previewBook.id}
                  className="h-full min-h-0 overflow-hidden rounded-md border border-border/50 bg-background/70 dark:bg-black/10"
                >
                  {previewBook.coverUrl ? (
                    <img
                      src={previewBook.coverUrl}
                      alt={previewBook.title}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center px-1.5 text-center text-[9px] font-medium leading-tight text-muted-foreground">
                      {previewBook.title}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="absolute bottom-3 right-3 flex h-8 w-8 items-center justify-center rounded-full border border-border/70 bg-background/95 text-xs font-semibold text-foreground shadow-sm">
            {collection.bookCount}
          </div>
        </div>

        <div className="px-1 pt-3">
          <h3 className="line-clamp-2 text-base font-semibold tracking-tight text-foreground sm:text-lg">
            {collection.name}
          </h3>
        </div>
      </button>
    </div>
  );
}
