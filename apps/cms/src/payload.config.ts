import { sqliteAdapter } from '@payloadcms/db-sqlite'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { seoPlugin } from '@payloadcms/plugin-seo'
import { s3Storage } from '@payloadcms/storage-s3'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'

import { Users } from './collections/Users'
import { Media } from './collections/Media'
import { Posts } from './collections/Posts'
import { Tags } from './collections/Tags'
import { Authors } from './collections/Authors'
import { About } from './globals/About'
import { SiteSettings } from './globals/SiteSettings'
import { canRunJobs } from './access/canRunJobs'
import { cloudflareLogger } from './logger'
import type { Config } from './payload-types'

declare module 'payload' {
  export interface GeneratedTypes extends Config {}
}

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  serverURL: process.env.SERVER_URL,
  collections: [Users, Media, Posts, Tags, Authors],
  globals: [About, SiteSettings],
  editor: lexicalEditor(),
  jobs: {
    access: {
      // The external Cloudflare Cron worker calls /api/payload-jobs/run with a
      // Bearer CRON_SECRET; logged-in admins may also trigger it manually.
      run: ({ req }) =>
        canRunJobs({
          hasUser: Boolean(req.user),
          authHeader: req.headers.get('authorization'),
          secret: process.env.CRON_SECRET,
        }),
    },
  },
  secret: process.env.PAYLOAD_SECRET || '',
  // Dev keeps the colorized pretty logger; Workers Logs need plain JSON.
  logger: process.env.NODE_ENV === 'production' ? cloudflareLogger : undefined,
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
    // Drop the payload augmentation so apps/web can import these types; added manually below.
    declare: false,
  },
  db: sqliteAdapter({
    client: {
      url: process.env.DATABASE_URL || '',
      // Required for remote Turso (libsql://); unset for a local file: DB.
      authToken: process.env.DATABASE_AUTH_TOKEN,
    },
    // Dev auto-syncs the schema; production applies committed migrations instead.
    push: process.env.NODE_ENV !== 'production',
    migrationDir: path.resolve(dirname, 'migrations'),
  }),
  // No sharp: it can't run on Cloudflare Workers (native/multithreaded).
  // Media uploads store originals as-is; no resize/crop/focal-point in admin.
  plugins: [
    seoPlugin({
      collections: ['posts'],
      uploadsCollection: 'media',
      tabbedUI: true,
      generateTitle: ({ doc }) => (doc?.title as string) ?? '',
      generateDescription: ({ doc }) => (doc?.excerpt as string) ?? '',
    }),
    // Store media on S3/R2. Falls back to local disk when S3_BUCKET is unset
    // (Vercel's filesystem is ephemeral, so this is required in production).
    s3Storage({
      enabled: Boolean(process.env.S3_BUCKET),
      collections: { media: true },
      bucket: process.env.S3_BUCKET || '',
      config: {
        endpoint: process.env.S3_ENDPOINT,
        region: process.env.S3_REGION || 'auto',
        // R2 and most S3-compatible stores need path-style.
        forcePathStyle: true,
        credentials: {
          accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
          secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
        },
      },
    }),
  ],
})
