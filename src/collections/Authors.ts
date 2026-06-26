import type { CollectionConfig } from 'payload'
import { slugField } from 'payload'

/**
 * Ghost の Author に相当するコレクション。
 * 管理ログイン用の Users とは分離し、記事の著者プロフィールを管理する。
 */
export const Authors: CollectionConfig = {
  slug: 'authors',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'email', 'updatedAt'],
  },
  access: {
    read: () => true,
  },
  fields: [
    { name: 'name', type: 'text', required: true },
    slugField({ useAsSlug: 'name', required: false }),
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
  timestamps: true,
}
