import { getPayload, Payload } from 'payload'
import config from '@/payload.config'

import { describe, it, beforeAll, expect } from 'vitest'

let payload: Payload

/**
 * Ghost からの移行に向けた Posts スキーマの振る舞いを検証する統合テスト。
 * - Posts / Tags / Authors の3コレクション
 * - slug の自動生成
 * - draft/publish (versions.drafts)
 * - リレーション (authors / tags)
 * - SEO meta (plugin-seo)
 */
describe('Blog schema (Ghost migration)', () => {
  beforeAll(async () => {
    payload = await getPayload({ config: await config })

    // 固定タイトルで作成する slug は unique 制約を持つため、前回実行の残留データがあると
    // 再実行時に衝突する。テスト対象コレクションを毎回クリーンにしてから開始する。
    for (const collection of ['posts', 'authors', 'tags'] as const) {
      await payload.delete({ collection, where: { id: { exists: true } } })
    }
  })

  it('creates a post and auto-generates the slug from the title', async () => {
    const post = await payload.create({
      collection: 'posts',
      data: {
        title: 'Hello Ghost Migration',
      },
    })

    expect(post.id).toBeDefined()
    expect(post.slug).toBe('hello-ghost-migration')
  })

  it('defaults a newly created post to draft status', async () => {
    const post = await payload.create({
      collection: 'posts',
      data: {
        title: 'A Draft Post',
      },
    })

    expect(post._status).toBe('draft')
  })

  it('can publish a post explicitly', async () => {
    const post = await payload.create({
      collection: 'posts',
      data: {
        title: 'A Published Post',
        _status: 'published',
      },
    })

    expect(post._status).toBe('published')
  })

  it('relates a post to authors and tags', async () => {
    const author = await payload.create({
      collection: 'authors',
      data: { name: 'Jane Doe' },
    })
    const tag = await payload.create({
      collection: 'tags',
      data: { name: 'Engineering' },
    })

    const post = await payload.create({
      collection: 'posts',
      data: {
        title: 'A Related Post',
        authors: [author.id],
        tags: [tag.id],
      },
    })

    const fetched = await payload.findByID({
      collection: 'posts',
      id: post.id,
      depth: 1,
    })

    const authors = fetched.authors as { name: string }[]
    const tags = fetched.tags as { name: string }[]
    expect(authors[0]?.name).toBe('Jane Doe')
    expect(tags[0]?.name).toBe('Engineering')
  })

  it('auto-generates slugs for tags and authors', async () => {
    const author = await payload.create({
      collection: 'authors',
      data: { name: 'John Smith' },
    })
    const tag = await payload.create({
      collection: 'tags',
      data: { name: 'Product News' },
    })

    expect(author.slug).toBe('john-smith')
    expect(tag.slug).toBe('product-news')
  })

  it('stores SEO meta fields provided by plugin-seo', async () => {
    const post = await payload.create({
      collection: 'posts',
      data: {
        title: 'A SEO Post',
        meta: {
          title: 'Custom SEO Title',
          description: 'Custom SEO description for search engines.',
        },
      },
    })

    const meta = post.meta as { title?: string; description?: string }
    expect(meta?.title).toBe('Custom SEO Title')
    expect(meta?.description).toBe('Custom SEO description for search engines.')
  })
})
