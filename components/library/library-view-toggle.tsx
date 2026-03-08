"use client";

import { FolderTree, Grid2X2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type LibraryViewMode = "grid" | "collections";

type LibraryViewToggleProps = {
  value: LibraryViewMode;
  onValueChange: (value: LibraryViewMode) => void;
  label: string;
  gridLabel: string;
  collectionsLabel: string;
};

export function LibraryViewToggle({
  value,
  onValueChange,
  label,
  gridLabel,
  collectionsLabel,
}: LibraryViewToggleProps) {
  const CurrentIcon = value === "collections" ? FolderTree : Grid2X2;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          aria-label={label}
          className={`cursor-pointer bg-white dark:bg-dark-gunmetal ${
            value === "collections" ? "border-2 border-deep-koamaru" : ""
          }`}
        >
          <CurrentIcon className="size-3.5" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-[190px]">
        <DropdownMenuLabel>{label}</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={value}
          onValueChange={(nextValue) =>
            onValueChange(nextValue as LibraryViewMode)
          }
        >
          <DropdownMenuRadioItem value="grid">
            <Grid2X2 className="mr-2 h-4 w-4" />
            {gridLabel}
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="collections">
            <FolderTree className="mr-2 h-4 w-4" />
            {collectionsLabel}
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
