"use client";

import { LibraryImportDialog } from "@/components/library/library-import-dialog";
import { LibraryCollectionCreateDialog } from "@/components/library/library-collection-create-dialog";

type LibraryActionsProps = {
  parentCollectionId?: string | null;
  parentCollectionName?: string;
};

export function LibraryActions({
  parentCollectionId,
  parentCollectionName,
}: LibraryActionsProps) {
  return (
    <div className="mb-4 mt-4 flex flex-wrap gap-2 md:mt-0">
      <LibraryImportDialog />
      <LibraryCollectionCreateDialog
        parentCollectionId={parentCollectionId}
        parentCollectionName={parentCollectionName}
      />
    </div>
  );
}
