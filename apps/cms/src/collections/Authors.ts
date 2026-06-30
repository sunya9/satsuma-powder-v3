import type { CollectionConfig } from 'payload'
import { slugField } from 'payload'
import { authenticated } from '../access/authenticated'
import { slugify } from '../fields/slug'
import { createAfterChangeRevalidate, createAfterDeleteRevalidate } from '../hooks/revalidate'

// Article author profiles, separate from the admin login Users collection.
export const Authors: CollectionConfig = {
  slug: 'authors',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'email', 'updatedAt'],
  },
  access: {
    read: authenticated,
  },
  fields: [
    { name: 'name', type: 'text', required: true },
    slugField({ useAsSlug: 'name', required: false, slugify }),
    { name: 'bio', type: 'textarea' },
    {
      name: 'profileImage',
      type: 'upload',
      relationTo: 'media',
      admin: { description: '著者プロフィール画像。移行時に外部画像 (Gravatar 等) を media へ取り込む。' },
    },
    { name: 'email', type: 'email' },
    { name: 'website', type: 'text' },
  ],
  hooks: {
    afterChange: [createAfterChangeRevalidate()],
    afterDelete: [createAfterDeleteRevalidate()],
  },
  timestamps: true,
}
