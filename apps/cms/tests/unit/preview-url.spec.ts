import { describe, it, expect } from 'vitest'
import { buildPreviewPath } from '@/fields/preview'

describe('buildPreviewPath', () => {
  // Fixed vector shared with apps/web preview-token — both must agree on the
  // HMAC message `${slug}:${exp}` and `${exp}.${hex}` token layout.
  it('builds a /preview enable URL with a slug-bound HMAC token', async () => {
    expect(
      await buildPreviewPath({
        webUrl: 'https://web.example.com',
        slug: 'hello',
        secret: 's3cret',
        now: 1_000_000,
        ttlMs: 0,
      }),
    ).toBe(
      'https://web.example.com/preview?slug=hello&token=1000000.05f4910a35bb26951b80c67e72aa12eb9f65c3db27b7bae269d49335556b7070',
    )
  })

  it('defaults to a 24h token lifetime', async () => {
    const now = 1_000_000
    const url = await buildPreviewPath({
      webUrl: 'https://w',
      slug: 'hello',
      secret: 's3cret',
      now,
    })
    expect(url).toContain(`token=${now + 24 * 60 * 60 * 1000}.`)
  })

  it('sets the token expiry to now + ttl', async () => {
    const url = await buildPreviewPath({
      webUrl: 'https://w',
      slug: 'hello',
      secret: 's3cret',
      now: 940_000,
      ttlMs: 60_000,
    })
    expect(url).toContain('token=1000000.')
  })

  it('trims a trailing slash on the web URL', async () => {
    const url = await buildPreviewPath({
      webUrl: 'https://web.example.com/',
      slug: 'hello',
      secret: 's3cret',
      now: 1_000_000,
      ttlMs: 0,
    })
    expect(url?.startsWith('https://web.example.com/preview?slug=hello&token=')).toBe(true)
  })

  it('encodes the slug in the query', async () => {
    const url = await buildPreviewPath({
      webUrl: 'https://w',
      slug: '日本語',
      secret: 's3cret',
      now: 1_000,
      ttlMs: 1_000,
    })
    expect(url).toContain(`slug=${encodeURIComponent('日本語')}`)
  })

  // Fail closed: no preview button rather than a broken/insecure URL.
  it('returns null when webUrl, slug, or secret is missing', async () => {
    expect(await buildPreviewPath({ webUrl: '', slug: 'x', secret: 's', now: 0 })).toBeNull()
    expect(await buildPreviewPath({ webUrl: 'https://w', slug: '', secret: 's', now: 0 })).toBeNull()
    expect(
      await buildPreviewPath({ webUrl: 'https://w', slug: 'x', secret: undefined, now: 0 }),
    ).toBeNull()
  })
})
