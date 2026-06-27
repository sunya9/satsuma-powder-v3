import { describe, it, expect } from 'vitest'
import {
  mapAuthor,
  mapTag,
  mapPost,
  isMigratablePost,
  buildRelationIndex,
} from '@/scripts/ghost/mappers'

/**
 * Ghost エクスポートレコード → Payload create データへの純粋写像のテスト。
 * I/O を伴わないため DB は不要。
 */
describe('ghost mappers', () => {
  describe('mapAuthor', () => {
    it('maps fields and preserves the Ghost slug', () => {
      const result = mapAuthor({
        id: 'u1',
        name: 'Test Author',
        slug: 'test-author',
        email: 'author@example.com',
        profile_image: 'https://example.com/avatar.png',
        bio: null,
        website: 'https://example.com',
      })
      expect(result).toEqual({
        name: 'Test Author',
        slug: 'test-author',
        profileImage: 'https://example.com/avatar.png',
        email: 'author@example.com',
        website: 'https://example.com',
        // bio は null のため省略される
      })
    })

    it('normalizes null/empty optionals to undefined', () => {
      const result = mapAuthor({ id: 'u1', name: 'No Profile', slug: 'no-profile', bio: '   ' })
      expect(result.bio).toBeUndefined()
      expect(result.profileImage).toBeUndefined()
      expect(result.email).toBeUndefined()
    })
  })

  describe('mapTag', () => {
    it('maps a tag with feature image', () => {
      expect(
        mapTag({
          id: 't1',
          name: 'Game',
          slug: 'game',
          description: 'ゲームの話。',
          feature_image: 'https://images.unsplash.com/photo-1492044715545',
        }),
      ).toEqual({
        name: 'Game',
        slug: 'game',
        description: 'ゲームの話。',
        featureImage: 'https://images.unsplash.com/photo-1492044715545',
      })
    })

    it('keeps a Ghost slug that differs from the name', () => {
      const result = mapTag({ id: 't8', name: 'Ghost', slug: 'ghost-tag', feature_image: null })
      expect(result.slug).toBe('ghost-tag')
      expect(result.featureImage).toBeUndefined()
    })
  })

  describe('mapPost', () => {
    it('maps a published post', () => {
      expect(
        mapPost({
          id: 'p1',
          title: 'Transmission',
          slug: 'transmission',
          status: 'published',
          type: 'post',
          visibility: 'public',
          custom_excerpt: null,
          feature_image: 'https://firebasestorage.googleapis.com/x.png',
          published_at: '2016-06-05T22:22:14.000Z',
        }),
      ).toEqual({
        title: 'Transmission',
        slug: 'transmission',
        featureImage: 'https://firebasestorage.googleapis.com/x.png',
        publishedAt: '2016-06-05T22:22:14.000Z',
        visibility: 'public',
        _status: 'published',
      })
    })

    it('maps draft status to _status draft', () => {
      const result = mapPost({ id: 'p2', title: 'A Draft', slug: 'a-draft', status: 'draft' })
      expect(result._status).toBe('draft')
    })

    it('keeps custom_excerpt as excerpt', () => {
      const result = mapPost({
        id: 'p3',
        title: 'X',
        slug: 'x',
        status: 'published',
        custom_excerpt: '短い要約',
      })
      expect(result.excerpt).toBe('短い要約')
    })

    it('falls back to public for unknown visibility', () => {
      const result = mapPost({
        id: 'p4',
        title: 'Y',
        slug: 'y',
        status: 'published',
        visibility: 'something-weird',
      })
      expect(result.visibility).toBe('public')
    })
  })

  describe('isMigratablePost', () => {
    it('accepts type=post', () => {
      expect(isMigratablePost({ id: 'p', title: 't', slug: 's', status: 'published', type: 'post' })).toBe(true)
    })
    it('rejects type=page', () => {
      expect(isMigratablePost({ id: 'p', title: 't', slug: 's', status: 'published', type: 'page' })).toBe(false)
    })
    it('treats missing type as post', () => {
      expect(isMigratablePost({ id: 'p', title: 't', slug: 's', status: 'published' })).toBe(true)
    })
  })

  describe('buildRelationIndex', () => {
    it('groups targets by post_id sorted by sort_order', () => {
      const index = buildRelationIndex(
        [
          { post_id: 'a', tag_id: 't2', sort_order: 1 },
          { post_id: 'a', tag_id: 't1', sort_order: 0 },
          { post_id: 'b', tag_id: 't3', sort_order: 0 },
        ],
        'tag_id',
      )
      expect(index.get('a')).toEqual(['t1', 't2'])
      expect(index.get('b')).toEqual(['t3'])
      expect(index.get('missing')).toBeUndefined()
    })

    it('works for author relations too', () => {
      const index = buildRelationIndex(
        [{ post_id: 'a', author_id: 'u1', sort_order: 0 }],
        'author_id',
      )
      expect(index.get('a')).toEqual(['u1'])
    })
  })
})
