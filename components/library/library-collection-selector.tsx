"use client";

import * as React from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";

import type { LibraryCollectionTreeNode } from "@/lib/library/types";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

type LibraryCollectionSelectorProps = {
  collections: LibraryCollectionTreeNode[];
  selectedIds: string[];
  onChange: (nextSelectedIds: string[]) => void;
  placeholder: string;
  searchPlaceholder: string;
  emptyLabel: string;
  selectedLabel: string;
  clearLabel: string;
  disabled?: boolean;
};

export function LibraryCollectionSelector({
  collections,
  selectedIds,
  onChange,
  placeholder,
  searchPlaceholder,
  emptyLabel,
  selectedLabel,
  clearLabel,
  disabled = false,
}: LibraryCollectionSelectorProps) {
  const [open, setOpen] = React.useState(false);
  const [portalContainer, setPortalContainer] =
    React.useState<HTMLElement | null>(null);
  const wrapperRef = React.useRef<HTMLDivElement | null>(null);

  const selectedSet = React.useMemo(() => new Set(selectedIds), [selectedIds]);
  const selectedCollections = React.useMemo(
    () => collections.filter((collection) => selectedSet.has(collection.id)),
    [collections, selectedSet],
  );

  const toggleCollection = React.useCallback(
    (collectionId: string) => {
      if (selectedSet.has(collectionId)) {
        onChange(selectedIds.filter((id) => id !== collectionId));
        return;
      }

      onChange([...selectedIds, collectionId]);
    },
    [onChange, selectedIds, selectedSet],
  );

  const removeCollection = React.useCallback(
    (collectionId: string) => {
      onChange(selectedIds.filter((id) => id !== collectionId));
    },
    [onChange, selectedIds],
  );

  const buttonLabel =
    selectedCollections.length > 0
      ? `${selectedCollections.length} ${selectedLabel}`
      : placeholder;

  React.useEffect(() => {
    if (!open) {
      return;
    }

    const nextContainer = wrapperRef.current?.closest(
      "[data-slot='dialog-content']",
    );
    setPortalContainer(
      nextContainer instanceof HTMLElement ? nextContainer : null,
    );
  }, [open]);

  return (
    <div ref={wrapperRef} className="space-y-3">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className="w-full justify-between"
          >
            <span className="truncate">{buttonLabel}</span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[min(500px,calc(100vw-2rem))] p-0"
          align="start"
          container={portalContainer}
        >
          <Command>
            <CommandInput placeholder={searchPlaceholder} className="h-9" />
            <CommandList>
              <CommandEmpty>{emptyLabel}</CommandEmpty>
              <CommandGroup>
                {collections.map((collection) => {
                  const isSelected = selectedSet.has(collection.id);

                  return (
                    <CommandItem
                      key={collection.id}
                      value={`${collection.name} ${collection.depth}`}
                      onSelect={() => toggleCollection(collection.id)}
                      className="cursor-pointer"
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4 shrink-0",
                          isSelected ? "opacity-100" : "opacity-0",
                        )}
                      />
                      <span
                        className="truncate"
                        style={{ paddingLeft: `${collection.depth * 16}px` }}
                      >
                        {collection.name}
                      </span>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {selectedCollections.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedCollections.map((collection) => (
            <Badge
              key={collection.id}
              variant="secondary"
              className="flex items-center gap-1 px-2 py-1"
            >
              <span className="max-w-44 truncate">{collection.name}</span>
              {!disabled && (
                <button
                  type="button"
                  onClick={() => removeCollection(collection.id)}
                  className="rounded-sm opacity-70 transition-opacity hover:opacity-100"
                  aria-label={`${clearLabel}: ${collection.name}`}
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
