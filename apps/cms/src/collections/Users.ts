import type { CollectionConfig } from 'payload'

export const Users: CollectionConfig = {
  slug: 'users',
  admin: {
    useAsTitle: 'email',
  },
  // API key lets the web SSG build authenticate (Authorization: users API-Key <key>).
  // Lock the account after repeated failures to blunt brute-force on /api/users/login.
  auth: {
    useAPIKey: true,
    maxLoginAttempts: 5,
    lockTime: 15 * 60 * 1000,
    // Default is 2h, which forces re-login constantly on a single-admin blog.
    tokenExpiration: 60 * 60 * 24 * 30, // 30 days (seconds)
  },
  fields: [],
}
