/* Convex */
import { fetchQuery } from "convex/nextjs";
import { auth } from "@clerk/nextjs/server";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

/* Components */
import { notFound } from "next/navigation";
import { LibraryBookDetailClient } from "@/components/library/library-book-detail-client";
import type { LibraryBookDetailRecord } from "@/lib/library/types";

interface LibraryBookDetailPageProps {
  params: Promise<{
    bookId: Id<"library_books">;
  }>;
}

export default async function LibraryBookDetailPage({
  params,
}: LibraryBookDetailPageProps) {
  const { bookId } = await params;
  const authData = await auth();
  const token = await authData.getToken({ template: "convex" });
  const fetchOptions = token ? { token } : undefined;

  const book = (await fetchQuery(
    api.library.getLibraryBookById,
    { id: bookId },
    fetchOptions,
  )) as LibraryBookDetailRecord | null;

  if (!book) {
    notFound();
  }

  return <LibraryBookDetailClient bookId={bookId} initialBook={book} />;
}
