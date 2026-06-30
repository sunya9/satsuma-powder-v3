import type { GlobalConfig } from 'payload'
import { authenticated } from '../access/authenticated'
import { createGlobalAfterChangeRevalidate } from '../hooks/revalidate'

export const SiteSettings: GlobalConfig = {
  slug: 'site-settings',
  access: {
    read: authenticated,
  },
  fields: [
    { name: 'title', type: 'text', required: true },
    { name: 'description', type: 'textarea' },
    { name: 'twitterHandle', type: 'text' },
    { name: 'icon', type: 'upload', relationTo: 'media' },
    { name: 'coverImage', type: 'upload', relationTo: 'media' },
  ],
  hooks: {
    afterChange: [createGlobalAfterChangeRevalidate()],
  },
}
