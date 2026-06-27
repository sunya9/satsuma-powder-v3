import type { CollectionConfig } from 'payload'

export const Users: CollectionConfig = {
  slug: 'users',
  admin: {
    useAsTitle: 'email',
  },
  // API key lets the web SSG build authenticate (Authorization: users API-Key <key>).
  auth: { useAPIKey: true },
  fields: [],
}
