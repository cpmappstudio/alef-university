import { auth } from "@clerk/nextjs/server";
import { fetchQuery } from "convex/nextjs";

import { api } from "@/convex/_generated/api";
import { LibraryGridClient } from "@/components/library/library-grid-client";
import type { LibraryBookRecord } from "@/lib/library/types";

export default async function LibraryAllBooksPage() {
  const authData = await auth();
  const token = await authData.getToken({ template: "convex" });
  const fetchOptions = token ? { token } : undefined;

  const books = ((await fetchQuery(
    api.library.getAllLibraryBooks,
    {},
    fetchOptions,
  )) ?? []) as LibraryBookRecord[];

  return <LibraryGridClient books={books} scope="all" />;
}
