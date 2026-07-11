import { describe, it, expect } from 'vitest'

import {
  buildPostsListHref,
  getActiveStatus,
  STATUS_PARAM,
} from '@/components/nav-post-filters'

describe('buildPostsListHref', () => {
  it('links to the plain list view when no status is given', () => {
    expect(buildPostsListHref('/admin')).toBe('/admin/collections/posts')
  })

  it('links with the canonical where shape so the Filters UI shows the condition', () => {
    expect(buildPostsListHref('/admin', 'draft')).toBe(
      `/admin/collections/posts?${STATUS_PARAM}=draft`,
    )
  })

  it('respects a custom admin route', () => {
    expect(buildPostsListHref('/panel', 'published')).toBe(
      `/panel/collections/posts?${STATUS_PARAM}=published`,
    )
  })
})

describe('getActiveStatus', () => {
  const href = (status?: 'draft' | 'published') => {
    const url = new URL(`http://x${buildPostsListHref('/admin', status)}`)
    return { pathname: url.pathname, searchParams: url.searchParams }
  }

  it('returns null outside the posts list view', () => {
    expect(getActiveStatus('/admin/collections/tags', new URLSearchParams(), '/admin')).toBeNull()
  })

  it('returns "all" on the unfiltered posts list', () => {
    const { pathname, searchParams } = href()
    expect(getActiveStatus(pathname, searchParams, '/admin')).toBe('all')
  })

  it('returns the filtered status', () => {
    const { pathname, searchParams } = href('draft')
    expect(getActiveStatus(pathname, searchParams, '/admin')).toBe('draft')
  })

  it('does not treat a post edit view as the list view', () => {
    expect(
      getActiveStatus('/admin/collections/posts/123', new URLSearchParams(), '/admin'),
    ).toBeNull()
  })
})
