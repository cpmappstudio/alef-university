import { auth } from "@clerk/nextjs/server";
import { fetchQuery } from "convex/nextjs";

import { api } from "@/convex/_generated/api";
import { LibraryGridClient } from "@/components/library/library-grid-client";
import type { LibraryBookRecord } from "@/lib/library/types";

export default async function LibraryMyBooksPage() {
  const authData = await auth();
  const token = await authData.getToken({ template: "convex" });
  const fetchOptions = token ? { token } : undefined;

  const initialPage = await fetchQuery(
    api.library.getMyLibraryBooksPage,
    {
      paginationOpts: {
        numItems: 24,
        cursor: null,
      },
    },
    fetchOptions,
  );
  const initialBooks = (initialPage?.page ?? []) as LibraryBookRecord[];

  return <LibraryGridClient initialBooks={initialBooks} scope="my" />;
}
