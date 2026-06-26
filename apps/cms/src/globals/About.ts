import type { GlobalConfig } from 'payload'

/**
 * サイトの「about（サイトについて）」。記事一覧に混ぜず、単一ドキュメントの Global で持つ。
 * 本文は richText(Lexical) なので、フロントは記事と同じレンダラで描画できる。
 */
export const About: GlobalConfig = {
  slug: 'about',
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'content',
      type: 'richText',
      admin: { description: 'トップページに表示するサイト紹介文。' },
    },
  ],
}
