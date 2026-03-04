"use client";

import { LibraryImportDialog } from "@/components/library/library-import-dialog";

export function LibraryActions() {
  return (
    <div className="mb-4 mt-4 flex gap-2 md:mt-0">
      <LibraryImportDialog />
    </div>
  );
}
