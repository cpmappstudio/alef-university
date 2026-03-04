import { redirect } from "next/navigation";

import { ROUTES } from "@/lib/routes";

type LibraryRootPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function LibraryRootPage({ params }: LibraryRootPageProps) {
  const { locale } = await params;
  redirect(ROUTES.library.allBooks.withLocale(locale));
}
