import type { CollectionConfig } from 'payload'
import { slugField } from 'payload'
import { authenticated } from '../access/authenticated'

export const Posts: CollectionConfig = {
  slug: 'posts',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'authors', '_status', 'publishedAt'],
  },
  access: {
    read: authenticated,
  },
  fields: [
    { name: 'title', type: 'text', required: true },
    // Auto-generated from title, so not required at create time.
    slugField({ required: false }),
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
    {
      name: 'visibility',
      type: 'select',
      defaultValue: 'public',
      options: [
        { label: 'Public', value: 'public' },
        { label: 'Members', value: 'members' },
        { label: 'Paid', value: 'paid' },
      ],
      admin: { position: 'sidebar' },
    },
  ],
  versions: {
    drafts: true,
  },
  timestamps: true,
}
