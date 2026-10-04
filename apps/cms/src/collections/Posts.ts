import type { CollectionConfig } from 'payload'
import { authenticated } from '../access/authenticated'
import { autoIdSlug } from '../fields/slug'
import { buildPreviewPath, derivePreviewKey, resolvePreviewVerification } from '../fields/preview'
import { createAfterChangeRevalidate, createAfterDeleteRevalidate } from '../hooks/revalidate'
import { createSetPublishedAt } from '../hooks/published-at'

export const Posts: CollectionConfig = {
  slug: 'posts',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'authors', '_status', 'publishedAt'],
    // Opens the web draft-preview route in a new tab (see buildPreviewPath).
    preview: async (data, { req }) =>
      buildPreviewPath({
        webUrl: process.env.WEB_URL,
        slug: typeof data?.slug === 'string' ? data.slug : undefined,
        secret: await derivePreviewKey(req.payload.secret),
        now: Date.now(),
      }),
  },
  endpoints: [
    {
      // Called by the web preview Worker (API key) so the signing key stays in the CMS.
      path: '/preview-token/verify',
      method: 'get',
      handler: async (req) => {
        const { status, body } = await resolvePreviewVerification({
          authenticated: Boolean(req.user),
          slug: req.searchParams.get('slug'),
          token: req.searchParams.get('token'),
          secret: await derivePreviewKey(req.payload.secret),
          now: Date.now(),
        })
        return Response.json(body, { status })
      },
    },
  ],
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
        description: '一覧やSNS共有で使う短い要約。',
      },
    },
    {
      name: 'featureImage',
      type: 'upload',
      relationTo: 'media',
      admin: {
        description: 'アイキャッチ画像。',
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
