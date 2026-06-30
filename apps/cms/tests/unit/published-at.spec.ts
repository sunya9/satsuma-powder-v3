import { describe, it, expect } from 'vitest'
import { resolvePublishedAt, createSetPublishedAt } from '@/hooks/published-at'

const NOW = '2026-07-01T00:00:00.000Z'

describe('resolvePublishedAt', () => {
  it('returns now when published and publishedAt is unset', () => {
    expect(resolvePublishedAt({ isPublished: true, currentPublishedAt: undefined, now: NOW })).toBe(NOW)
    expect(resolvePublishedAt({ isPublished: true, currentPublishedAt: null, now: NOW })).toBe(NOW)
    expect(resolvePublishedAt({ isPublished: true, currentPublishedAt: '', now: NOW })).toBe(NOW)
  })

  it('returns undefined (keep existing) when published and already set', () => {
    expect(
      resolvePublishedAt({ isPublished: true, currentPublishedAt: '2025-01-01T00:00:00.000Z', now: NOW }),
    ).toBeUndefined()
  })

  it('returns undefined (untouched) when not published (draft / unpublish)', () => {
    expect(resolvePublishedAt({ isPublished: false, currentPublishedAt: undefined, now: NOW })).toBeUndefined()
    expect(
      resolvePublishedAt({ isPublished: false, currentPublishedAt: '2025-01-01T00:00:00.000Z', now: NOW }),
    ).toBeUndefined()
  })
})

describe('createSetPublishedAt', () => {
  it('sets publishedAt when publishing without a date', () => {
    const hook = createSetPublishedAt()
    const data: Record<string, unknown> = { _status: 'published' }
    const res = hook({ data, originalDoc: {} } as never)
    expect(res.publishedAt).toBeTruthy()
  })

  it('does not overwrite an existing publishedAt on data', () => {
    const hook = createSetPublishedAt()
    const data: Record<string, unknown> = { _status: 'published', publishedAt: '2025-01-01T00:00:00.000Z' }
    const res = hook({ data, originalDoc: {} } as never)
    expect(res.publishedAt).toBe('2025-01-01T00:00:00.000Z')
  })

  it('does not stamp when originalDoc already has publishedAt (leaves data untouched)', () => {
    const hook = createSetPublishedAt()
    const data: Record<string, unknown> = { _status: 'published' }
    const res = hook({ data, originalDoc: { publishedAt: '2025-06-01T00:00:00.000Z' } } as never)
    // The hook must not add publishedAt; the stored value is retained at the DB layer.
    expect(res.publishedAt).toBeUndefined()
  })

  it('does not set publishedAt on unpublish (published -> draft)', () => {
    const hook = createSetPublishedAt()
    const data: Record<string, unknown> = { _status: 'draft' }
    const res = hook({ data, originalDoc: { publishedAt: '2025-06-01T00:00:00.000Z' } } as never)
    expect(res.publishedAt).toBeUndefined()
  })
})
