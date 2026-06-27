import type { CollectionConfig } from 'payload'
import { slugField } from 'payload'

export const Tags: CollectionConfig = {
  slug: 'tags',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'updatedAt'],
  },
  access: {
    read: () => true,
  },
  fields: [
    { name: 'name', type: 'text', required: true },
    slugField({ useAsSlug: 'name', required: false }),
    { name: 'description', type: 'textarea' },
    {
      name: 'featureImage',
      type: 'upload',
      relationTo: 'media',
      admin: { description: 'タグのカバー画像。移行時に外部画像を media へ取り込む。' },
    },
  ],
  timestamps: true,
}
