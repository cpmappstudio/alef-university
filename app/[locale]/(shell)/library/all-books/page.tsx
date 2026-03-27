import { Suspense } from "react";

import { LibraryGridClient } from "@/components/library/library-grid-client";

export default async function LibraryAllBooksPage() {
  return (
    <Suspense fallback={null}>
      <LibraryGridClient initialBooks={[]} scope="all" />
    </Suspense>
  );
}
