import { LibraryGridClient } from "@/components/library/library-grid-client";

export default async function LibraryAllBooksPage() {
  return <LibraryGridClient initialBooks={[]} scope="all" />;
}
