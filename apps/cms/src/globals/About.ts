import type { GlobalConfig } from 'payload'
import { authenticated } from '../access/authenticated'
import { createGlobalAfterChangeRevalidate } from '../hooks/revalidate'

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
  hooks: {
    // onlyPublished: with drafts enabled, only publish/unpublish should rebuild
    // the site; draft saves and autosaves must not.
    afterChange: [createGlobalAfterChangeRevalidate({ onlyPublished: true })],
  },
  versions: {
    drafts: {
      // Draft versions only; the revalidate hook skips autosave requests.
      autosave: true,
    },
  },
}
