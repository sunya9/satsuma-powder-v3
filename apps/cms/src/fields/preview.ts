// Builds the web preview "enable" URL for a draft. Instead of the long-lived
// shared secret, the URL carries a short-lived, slug-bound HMAC token: the web
// endpoint verifies it, then moves the secret into an httpOnly cookie and
// redirects to a clean URL. A leaked token expires in seconds and can't be
// reused for another draft. Format shared with apps/web verifyPreviewToken:
// token = `${exp}.${hexHmac}`, HMAC-SHA256 message = `${slug}:${exp}` (ms epoch).
// Returns null (no preview button) when any input is missing, so a misconfigured
// deploy never renders a broken or unauthenticated link.
const encoder = new TextEncoder()

function toHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('')
}

async function hmacHex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(message))
  return toHex(sig)
}

export async function buildPreviewPath({
  webUrl,
  slug,
  secret,
  now,
  ttlMs = 60_000,
}: {
  webUrl?: string
  slug?: string
  secret?: string
  now: number
  ttlMs?: number
}): Promise<string | null> {
  if (!webUrl || !slug || !secret) return null
  const exp = now + ttlMs
  const token = `${exp}.${await hmacHex(secret, `${slug}:${exp}`)}`
  const base = webUrl.replace(/\/$/, '')
  return `${base}/preview?slug=${encodeURIComponent(slug)}&token=${encodeURIComponent(token)}`
}
