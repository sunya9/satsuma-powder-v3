const MAX_AGE_SECONDS = 60 * 60;

// The cookie holds the token itself and is re-verified by the CMS on every hit,
// so outliving the token would only produce 404s; cap it at the token's expiry.
export function previewCookieMaxAge(token: string, now: number): number {
  const dot = token.indexOf(".");
  const exp = dot < 0 ? NaN : Number(token.slice(0, dot));
  if (!Number.isFinite(exp)) return MAX_AGE_SECONDS;
  return Math.max(0, Math.min(MAX_AGE_SECONDS, Math.floor((exp - now) / 1000)));
}
