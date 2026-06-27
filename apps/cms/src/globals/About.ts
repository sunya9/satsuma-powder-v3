import type { GlobalConfig } from 'payload'
import { authenticated } from '../access/authenticated'

// Site "about" as a singleton Global rather than a post.
export const About: GlobalConfig = {
  slug: 'about',
  access: {
    read: authenticated,
  },
  fields: [
    {
      name: 'content',
      type: 'richText',
      admin: { description: 'トップページに表示するサイト紹介文。' },
    },
  ],
}
