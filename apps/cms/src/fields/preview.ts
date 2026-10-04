// Builds the web preview "enable" URL for a draft. The URL carries a
// short-lived, slug-bound HMAC token instead of a long-lived secret; the web
// Worker hands it back to this CMS (verify endpoint on Posts) before showing a
// draft, so the signing key never leaves the CMS. A leaked token expires and
// can't be reused for another draft.
// token = `${exp}.${hexHmac}`, HMAC-SHA256 message = `${slug}:${exp}` (ms epoch).
// Returns null (no preview button) when any input is missing, so a misconfigured
// deploy never renders a broken or unauthenticated link.
const encoder = new TextEncoder()

// Domain separation: PAYLOAD_SECRET also keys JWTs and API-key encryption, so
// preview tokens get their own derived key. Bumping the label revokes every
// outstanding preview token without rotating PAYLOAD_SECRET.
const PREVIEW_KEY_LABEL = 'preview-token-v1'

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

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

export function derivePreviewKey(payloadSecret: string): Promise<string> {
  return hmacHex(payloadSecret, PREVIEW_KEY_LABEL)
}

export async function buildPreviewPath({
  webUrl,
  slug,
  secret,
  now,
  // 24h: the token is minted when the admin edit view renders, so a short TTL
  // would expire before an editor finishes a long session and clicks Preview.
  ttlMs = 24 * 60 * 60 * 1000,
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

export async function verifyPreviewToken({
  token,
  slug,
  secret,
  now,
}: {
  token: string | null | undefined
  slug: string | null | undefined
  secret: string | undefined
  now: number
}): Promise<boolean> {
  if (!secret || !token || !slug) return false
  const dot = token.indexOf('.')
  if (dot < 0) return false
  const exp = Number(token.slice(0, dot))
  if (!Number.isFinite(exp) || now > exp) return false
  const expected = await hmacHex(secret, `${slug}:${exp}`)
  return timingSafeEqual(token.slice(dot + 1), expected)
}

export type PreviewVerification = { status: 200 | 401 | 404; body: { ok: boolean } }

export async function resolvePreviewVerification({
  authenticated,
  ...input
}: {
  authenticated: boolean
  slug: string | null | undefined
  token: string | null | undefined
  secret: string | undefined
  now: number
}): Promise<PreviewVerification> {
  if (!authenticated) return { status: 401, body: { ok: false } }
  // One 404 for every rejection reason so the endpoint isn't an oracle.
  if (!(await verifyPreviewToken(input))) return { status: 404, body: { ok: false } }
  return { status: 200, body: { ok: true } }
}
