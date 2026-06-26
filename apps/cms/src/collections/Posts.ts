import type { CollectionConfig } from 'payload'
import { slugField } from 'payload'

/**
 * Ghost の Post に相当するブログ記事コレクション。
 *
 * - slug: title から自動生成 (slugField)
 * - versions.drafts: Ghost の下書き/公開ワークフローに対応
 * - SEO/OGP のメタフィールドは payload.config の seoPlugin が `meta` グループとして注入する
 */
export const Posts: CollectionConfig = {
  slug: 'posts',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'authors', '_status', 'publishedAt'],
  },
  access: {
    // 匿名アクセスでは公開済みの記事のみ閲覧可能。ログインユーザーは下書きも閲覧できる。
    read: ({ req: { user } }) => {
      if (user) return true
      return { _status: { equals: 'published' } }
    },
  },
  fields: [
    { name: 'title', type: 'text', required: true },
    // slug は title から自動生成される。create 入力時点では未指定のため required: false。
    slugField({ required: false }),
    {
      name: 'content',
      type: 'richText',
      // 移行時の堅牢性を優先し任意。本文必須にしたい場合は required: true に変更する。
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
