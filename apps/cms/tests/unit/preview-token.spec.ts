import { describe, it, expect } from 'vitest'
import {
  buildPreviewPath,
  derivePreviewKey,
  resolvePreviewVerification,
  verifyPreviewToken,
} from '@/fields/preview'

const SECRET = 's3cret'

async function mintToken({
  slug,
  exp,
  secret = SECRET,
}: {
  slug: string
  exp: number
  secret?: string
}) {
  const url = await buildPreviewPath({ webUrl: 'https://w', slug, secret, now: exp, ttlMs: 0 })
  return new URL(url!).searchParams.get('token')!
}

describe('derivePreviewKey', () => {
  it('is deterministic for the same PAYLOAD_SECRET', async () => {
    expect(await derivePreviewKey('payload-secret')).toBe(await derivePreviewKey('payload-secret'))
  })

  it('is a 32-byte hex key that differs from the input secret', async () => {
    const key = await derivePreviewKey('payload-secret')
    expect(key).toMatch(/^[0-9a-f]{64}$/)
    expect(key).not.toBe('payload-secret')
  })

  it('differs per PAYLOAD_SECRET', async () => {
    expect(await derivePreviewKey('a')).not.toBe(await derivePreviewKey('b'))
  })

  it('matches HMAC-SHA256(PAYLOAD_SECRET, "preview-token-v1")', async () => {
    // Pinned so an accidental label change (which revokes every token) fails loudly.
    expect(await derivePreviewKey('payload-secret')).toBe(
      'd5c77c7fd0833a4f6529b301cad6a5108d30b2f4ec552121b94557699a4a19b7',
    )
  })
})

describe('verifyPreviewToken', () => {
  it('accepts the fixed vector signed by buildPreviewPath', async () => {
    expect(
      await verifyPreviewToken({
        token: '1000000.05f4910a35bb26951b80c67e72aa12eb9f65c3db27b7bae269d49335556b7070',
        slug: 'hello',
        secret: SECRET,
        now: 1_000_000,
      }),
    ).toBe(true)
  })

  it('accepts a fresh token for the matching slug', async () => {
    const token = await mintToken({ slug: 'post-a', exp: 2_000 })
    expect(await verifyPreviewToken({ token, slug: 'post-a', secret: SECRET, now: 1_500 })).toBe(
      true,
    )
  })

  it('rejects an expired token', async () => {
    const token = await mintToken({ slug: 'post-a', exp: 1_000 })
    expect(await verifyPreviewToken({ token, slug: 'post-a', secret: SECRET, now: 1_001 })).toBe(
      false,
    )
  })

  it('rejects a token minted for a different slug', async () => {
    const token = await mintToken({ slug: 'post-a', exp: 2_000 })
    expect(await verifyPreviewToken({ token, slug: 'post-b', secret: SECRET, now: 1_500 })).toBe(
      false,
    )
  })

  it('rejects a tampered signature', async () => {
    const token = await mintToken({ slug: 'post-a', exp: 2_000 })
    const tampered = token.slice(0, -1) + (token.endsWith('0') ? '1' : '0')
    expect(
      await verifyPreviewToken({ token: tampered, slug: 'post-a', secret: SECRET, now: 1_500 }),
    ).toBe(false)
  })

  it('rejects a tampered expiry', async () => {
    const token = await mintToken({ slug: 'post-a', exp: 2_000 })
    const extended = token.replace(/^2000\./, '9000.')
    expect(
      await verifyPreviewToken({ token: extended, slug: 'post-a', secret: SECRET, now: 1_500 }),
    ).toBe(false)
  })

  it('rejects when the secret is wrong', async () => {
    const token = await mintToken({ slug: 'post-a', exp: 2_000 })
    expect(await verifyPreviewToken({ token, slug: 'post-a', secret: 'other', now: 1_500 })).toBe(
      false,
    )
  })

  // Fail closed.
  it('rejects missing or malformed input', async () => {
    expect(await verifyPreviewToken({ token: '', slug: 'a', secret: SECRET, now: 0 })).toBe(false)
    expect(await verifyPreviewToken({ token: null, slug: 'a', secret: SECRET, now: 0 })).toBe(false)
    expect(await verifyPreviewToken({ token: 'nodot', slug: 'a', secret: SECRET, now: 0 })).toBe(
      false,
    )
    expect(await verifyPreviewToken({ token: 'x.abc', slug: 'a', secret: SECRET, now: 0 })).toBe(
      false,
    )
    expect(await verifyPreviewToken({ token: '1.abc', slug: 'a', secret: undefined, now: 0 })).toBe(
      false,
    )
    expect(await verifyPreviewToken({ token: '1.abc', slug: '', secret: SECRET, now: 0 })).toBe(
      false,
    )
  })
})

describe('resolvePreviewVerification', () => {
  it('returns 401 when the request is unauthenticated, before looking at the token', async () => {
    const token = await mintToken({ slug: 'post-a', exp: 2_000 })
    expect(
      await resolvePreviewVerification({
        authenticated: false,
        slug: 'post-a',
        token,
        secret: SECRET,
        now: 1_500,
      }),
    ).toEqual({ status: 401, body: { ok: false } })
  })

  it('returns 200 for a valid token', async () => {
    const token = await mintToken({ slug: 'post-a', exp: 2_000 })
    expect(
      await resolvePreviewVerification({
        authenticated: true,
        slug: 'post-a',
        token,
        secret: SECRET,
        now: 1_500,
      }),
    ).toEqual({ status: 200, body: { ok: true } })
  })

  // Uniform 404 for every rejection so callers can't tell why a token failed.
  it('returns 404 for missing, expired, or mismatched tokens', async () => {
    const token = await mintToken({ slug: 'post-a', exp: 2_000 })
    const cases = [
      { slug: null, token },
      { slug: 'post-a', token: null },
      { slug: 'post-b', token },
      { slug: 'post-a', token: 'garbage' },
    ]
    for (const c of cases) {
      expect(
        await resolvePreviewVerification({ authenticated: true, ...c, secret: SECRET, now: 1_500 }),
      ).toEqual({ status: 404, body: { ok: false } })
    }
    expect(
      await resolvePreviewVerification({
        authenticated: true,
        slug: 'post-a',
        token,
        secret: SECRET,
        now: 2_001,
      }),
    ).toEqual({ status: 404, body: { ok: false } })
  })
})
