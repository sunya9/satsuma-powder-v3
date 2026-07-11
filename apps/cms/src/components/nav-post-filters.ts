export type PostStatus = 'draft' | 'published'
export type ActiveStatus = PostStatus | 'all'

// Canonical nested where shape used by the list view URL, so the built-in
// Filters UI displays the condition instead of just silently applying it.
export const STATUS_PARAM = 'where[or][0][and][0][_status][equals]'

const listPath = (adminRoute: string) => `${adminRoute}/collections/posts`

export function buildPostsListHref(adminRoute: string, status?: PostStatus): string {
  const base = listPath(adminRoute)
  return status ? `${base}?${STATUS_PARAM}=${status}` : base
}

// Returns the active filter on the posts list view, or null on any other view.
export function getActiveStatus(
  pathname: string,
  searchParams: URLSearchParams,
  adminRoute: string,
): ActiveStatus | null {
  if (pathname !== listPath(adminRoute)) return null
  const status = searchParams.get(STATUS_PARAM)
  return status === 'draft' || status === 'published' ? status : 'all'
}
