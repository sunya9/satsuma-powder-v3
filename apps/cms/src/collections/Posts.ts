import type { CollectionConfig } from 'payload'
import { authenticated } from '../access/authenticated'
import { autoIdSlug } from '../fields/slug'
import { buildPreviewPath } from '../fields/preview'
import { createAfterChangeRevalidate, createAfterDeleteRevalidate } from '../hooks/revalidate'
import { createSetPublishedAt } from '../hooks/published-at'

export const Posts: CollectionConfig = {
  slug: 'posts',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'authors', '_status', 'publishedAt'],
    // Opens the web draft-preview route in a new tab (see buildPreviewPath).
    preview: (data) =>
      buildPreviewPath({
        webUrl: process.env.WEB_URL,
        slug: typeof data?.slug === 'string' ? data.slug : undefined,
        secret: process.env.PREVIEW_SECRET,
        now: Date.now(),
      }),
  },
  access: {
    read: authenticated,
  },
  fields: [
    { name: 'title', type: 'text', required: true },
    autoIdSlug,
    {
      name: 'content',
      type: 'richText',
    },
    {
      name: 'excerpt',
      type: 'textarea',
      admin: {
        description: 'Ghost の custom_excerpt 相当。一覧やSNS共有で使う短い要約。',
      },
    },
    {
      name: 'featureImage',
      type: 'upload',
      relationTo: 'media',
      admin: {
        description: 'アイキャッチ画像。移行時に Ghost の feature_image を media へ取り込む。',
      },
    },
    {
      name: 'authors',
      type: 'relationship',
      relationTo: 'authors',
      hasMany: true,
    },
    {
      name: 'tags',
      type: 'relationship',
      relationTo: 'tags',
      hasMany: true,
    },
    {
      name: 'publishedAt',
      type: 'date',
      admin: {
        position: 'sidebar',
        date: { pickerAppearance: 'dayAndTime' },
      },
    },
    {
      name: 'featured',
      type: 'checkbox',
      defaultValue: false,
      admin: { position: 'sidebar' },
    },
  ],
  hooks: {
    // Stamp publishedAt the first time a post becomes published.
    beforeChange: [createSetPublishedAt()],
    // Rebuild the Cloudflare SSG site only when a post's published state changes.
    afterChange: [createAfterChangeRevalidate({ onlyPublished: true })],
    afterDelete: [createAfterDeleteRevalidate({ onlyPublished: true })],
  },
  versions: {
    drafts: {
      // Enables scheduled publish/unpublish from the admin UI (needs the jobs runner).
      schedulePublish: true,
      // Draft versions only; the revalidate hooks skip autosave requests.
      autosave: true,
    },
  },
  timestamps: true,
}
