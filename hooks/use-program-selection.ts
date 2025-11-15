"use client";

import * as React from "react";
import type { Id } from "@/convex/_generated/dataModel";

export function useProgramSelection(initialProgramId?: Id<"programs">) {
  const [selectedPrograms, setSelectedPrograms] = React.useState<Set<string>>(
    () => (initialProgramId ? new Set([initialProgramId]) : new Set()),
  );

  const toggleProgram = React.useCallback((programId: string) => {
    setSelectedPrograms((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(programId)) {
        newSet.delete(programId);
      } else {
        newSet.add(programId);
      }
      return newSet;
    });
  }, []);

  const removeProgram = React.useCallback((programId: string) => {
    setSelectedPrograms((prev) => {
      const newSet = new Set(prev);
      newSet.delete(programId);
      return newSet;
    });
  }, []);

  const resetSelection = React.useCallback((programIds?: string[]) => {
    setSelectedPrograms(() => {
      if (!programIds) {
        return new Set();
      }
      return new Set(programIds);
    });
  }, []);

  return {
    selectedPrograms,
    setSelectedPrograms,
    toggleProgram,
    removeProgram,
    resetSelection,
  };
}
