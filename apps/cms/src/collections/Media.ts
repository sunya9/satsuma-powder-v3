import type { CollectionConfig } from 'payload'

export const Media: CollectionConfig = {
  slug: 'media',
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
    },
    {
      name: 'sourceUrl',
      type: 'text',
      index: true,
      admin: {
        readOnly: true,
        description: '移行元の外部画像URL。重複排除・冪等な再取り込みに使う。',
      },
    },
  ],
  upload: true,
}
