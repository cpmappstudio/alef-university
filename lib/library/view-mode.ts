export const LIBRARY_VIEW_MODE_STORAGE_KEY = "library:all-books:view-mode";
export const LIBRARY_VIEW_MODE_COOKIE_NAME = "library-view-mode";
export const LIBRARY_VIEW_MODE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export type LibraryViewMode = "grid" | "collections";

export function parseLibraryViewMode(
  value?: string | null,
): LibraryViewMode | undefined {
  if (value === "grid" || value === "collections") {
    return value;
  }

  return undefined;
}

export function buildLibraryViewModeCookieValue(viewMode: LibraryViewMode) {
  return [
    `${LIBRARY_VIEW_MODE_COOKIE_NAME}=${viewMode}`,
    "Path=/",
    `Max-Age=${LIBRARY_VIEW_MODE_COOKIE_MAX_AGE}`,
    "SameSite=Lax",
  ].join("; ");
}
