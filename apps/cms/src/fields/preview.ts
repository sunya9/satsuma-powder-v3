// Builds the web preview "enable" URL for a draft. The web Worker validates
// `previewSecret` against its own PREVIEW_SECRET, then moves it into an httpOnly
// cookie and redirects to the clean /preview/blog/:slug (so the secret never
// stays in the URL / browser history). The two sides must share the secret value.
// Returns null (no preview button) when any input is missing, so a misconfigured
// deploy never renders a broken or unauthenticated link.
export function buildPreviewPath({
  webUrl,
  slug,
  secret,
}: {
  webUrl?: string
  slug?: string
  secret?: string
}): string | null {
  if (!webUrl || !slug || !secret) return null
  const base = webUrl.replace(/\/$/, '')
  return `${base}/preview?slug=${encodeURIComponent(slug)}&previewSecret=${encodeURIComponent(secret)}`
}
