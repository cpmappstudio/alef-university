import { auth } from "@clerk/nextjs/server";
import { fetchQuery } from "convex/nextjs";

import { api } from "@/convex/_generated/api";
import { LibraryGridClient } from "@/components/library/library-grid-client";
import type { LibraryBookRecord } from "@/lib/library/types";

export default async function LibraryMyBooksPage() {
  const authData = await auth();
  const token = await authData.getToken({ template: "convex" });
  const fetchOptions = token ? { token } : undefined;

  const books = ((await fetchQuery(
    api.library.getMyLibraryBooks,
    {},
    fetchOptions,
  )) ?? []) as LibraryBookRecord[];

  return <LibraryGridClient books={books} scope="my" />;
}
