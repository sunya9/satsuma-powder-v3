import { describe, it, expect } from 'vitest'
import { buildPreviewPath } from '@/fields/preview'

describe('buildPreviewPath', () => {
  it('builds the web preview enable URL from slug and secret', () => {
    expect(
      buildPreviewPath({ webUrl: 'https://web.example.com', slug: 'hello', secret: 's3cret' }),
    ).toBe('https://web.example.com/preview?slug=hello&previewSecret=s3cret')
  })

  it('trims a trailing slash on the web URL', () => {
    expect(
      buildPreviewPath({ webUrl: 'https://web.example.com/', slug: 'hello', secret: 's3cret' }),
    ).toBe('https://web.example.com/preview?slug=hello&previewSecret=s3cret')
  })

  it('encodes the slug and secret', () => {
    expect(buildPreviewPath({ webUrl: 'https://w', slug: '日本語', secret: 's/e+c' })).toBe(
      `https://w/preview?slug=${encodeURIComponent('日本語')}&previewSecret=s%2Fe%2Bc`,
    )
  })

  // Fail closed: no preview button rather than a broken/insecure URL.
  it('returns null when webUrl, slug, or secret is missing', () => {
    expect(buildPreviewPath({ webUrl: '', slug: 'x', secret: 's' })).toBeNull()
    expect(buildPreviewPath({ webUrl: 'https://w', slug: '', secret: 's' })).toBeNull()
    expect(buildPreviewPath({ webUrl: 'https://w', slug: 'x', secret: undefined })).toBeNull()
  })
})
