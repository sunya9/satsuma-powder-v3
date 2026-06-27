// Deploy-specific only. Site metadata (title/description/icon/cover/twitter)
// lives in the cms SiteSettings global — see getSite() in payload.ts.
export const config = {
  url: (import.meta.env.VITE_SITE_URL ?? 'http://localhost:5173').replace(/\/$/, ''),
} as const
