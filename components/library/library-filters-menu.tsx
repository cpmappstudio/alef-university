"use client";

import * as React from "react";
import { ChevronRight, ListFilter, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

type LibraryFilterOption = {
  value: string;
  label: string;
};

type LibraryFilterSection = {
  id: string;
  label: string;
  options: LibraryFilterOption[];
  values: string[];
  onChange: (values: string[]) => void;
};

interface LibraryFiltersMenuProps {
  sections: LibraryFilterSection[];
  buttonLabel: string;
  filterByLabel: string;
  clearAllLabel: string;
  onClearAll: () => void;
}

export function LibraryFiltersMenu({
  sections,
  buttonLabel,
  filterByLabel,
  clearAllLabel,
  onClearAll,
}: LibraryFiltersMenuProps) {
  const [openSubMenus, setOpenSubMenus] = React.useState<Record<string, boolean>>(
    {},
  );
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const activeFilterCount = React.useMemo(
    () => sections.reduce((count, section) => count + section.values.length, 0),
    [sections],
  );
  const hasActiveFilters = activeFilterCount > 0;

  const toggleFilterValue = React.useCallback(
    (section: LibraryFilterSection, value: string) => {
      const isSelected = section.values.includes(value);
      const nextValues = isSelected
        ? section.values.filter((item) => item !== value)
        : [...section.values, value];

      section.onChange(nextValues);
    },
    [],
  );

  if (sections.length === 0) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className={cn(
            "relative cursor-pointer bg-white dark:bg-dark-gunmetal",
            hasActiveFilters && "border-2 border-deep-koamaru",
          )}
          aria-label={buttonLabel}
        >
          <ListFilter className="size-3.5" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-[220px]">
        <DropdownMenuLabel>{filterByLabel}</DropdownMenuLabel>
        <DropdownMenuSeparator />

        {sections.map((section) => {
          const hasSectionFilters = section.values.length > 0;
          const isOpen = openSubMenus[section.id];

          if (isMobile) {
            return (
              <div key={section.id} className="border-b last:border-b-0">
                <Button
                  variant="ghost"
                  className="h-auto w-full justify-between px-2 py-1.5 font-normal text-black hover:bg-accent dark:text-white"
                  onClick={() =>
                    setOpenSubMenus((previous) => ({
                      ...previous,
                      [section.id]: !previous[section.id],
                    }))
                  }
                >
                  <span className="flex items-center gap-2">
                    {section.label}
                    {hasSectionFilters && (
                      <Badge variant="secondary" className="h-5 px-1.5">
                        {section.values.length}
                      </Badge>
                    )}
                  </span>
                  <ChevronRight
                    className={cn(
                      "h-4 w-4 transition-transform",
                      isOpen && "rotate-90",
                    )}
                  />
                </Button>
                {isOpen && (
                  <div className="pb-2 pl-4">
                    {section.options.map((option) => (
                      <DropdownMenuCheckboxItem
                        key={option.value}
                        checked={section.values.includes(option.value)}
                        onCheckedChange={() => toggleFilterValue(section, option.value)}
                      >
                        {option.label}
                      </DropdownMenuCheckboxItem>
                    ))}
                  </div>
                )}
              </div>
            );
          }

          return (
            <DropdownMenuSub key={section.id}>
              <DropdownMenuSubTrigger className="flex items-center justify-between">
                <span>{section.label}</span>
                {hasSectionFilters && (
                  <Badge variant="secondary" className="ml-2 h-5 px-1.5">
                    {section.values.length}
                  </Badge>
                )}
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="w-[220px]">
                {section.options.map((option) => (
                  <DropdownMenuCheckboxItem
                    key={option.value}
                    checked={section.values.includes(option.value)}
                    onCheckedChange={() => toggleFilterValue(section, option.value)}
                  >
                    {option.label}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          );
        })}

        {hasActiveFilters && (
          <>
            <DropdownMenuSeparator />
            <Button
              variant="ghost"
              className="w-full justify-start text-sm font-normal text-black dark:text-white"
              onClick={onClearAll}
            >
              <X className="mr-2 h-4 w-4" />
              {clearAllLabel}
            </Button>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
