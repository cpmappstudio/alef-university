import { auth } from "@clerk/nextjs/server";
import { fetchQuery } from "convex/nextjs";
import { cookies } from "next/headers";

import { api } from "@/convex/_generated/api";
import { LibraryGridClient } from "@/components/library/library-grid-client";
import type { LibraryBookRecord } from "@/lib/library/types";
import {
  LIBRARY_VIEW_MODE_COOKIE_NAME,
  parseLibraryViewMode,
} from "@/lib/library/view-mode";

export default async function LibraryAllBooksPage() {
  const authData = await auth();
  const token = await authData.getToken({ template: "convex" });
  const fetchOptions = token ? { token } : undefined;
  const cookieStore = await cookies();
  const initialViewMode =
    parseLibraryViewMode(
      cookieStore.get(LIBRARY_VIEW_MODE_COOKIE_NAME)?.value,
    ) ?? "grid";

  const initialPage = await fetchQuery(
    api.library.getAllLibraryBooksPage,
    {
      paginationOpts: {
        numItems: 24,
        cursor: null,
      },
    },
    fetchOptions,
  );
  const initialBooks = (initialPage?.page ?? []) as LibraryBookRecord[];

  return (
    <LibraryGridClient
      initialBooks={initialBooks}
      scope="all"
      initialViewMode={initialViewMode}
    />
  );
}
