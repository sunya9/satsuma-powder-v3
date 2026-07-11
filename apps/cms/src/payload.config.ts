import { sqliteAdapter } from '@payloadcms/db-sqlite'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { seoPlugin } from '@payloadcms/plugin-seo'
import { r2Storage } from '@payloadcms/storage-r2'
import { type CloudflareContext, getCloudflareContext } from '@opennextjs/cloudflare'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import type { GetPlatformProxyOptions } from 'wrangler'

import { Users } from './collections/Users'
import { Media } from './collections/Media'
import { Posts } from './collections/Posts'
import { Tags } from './collections/Tags'
import { Authors } from './collections/Authors'
import { About } from './globals/About'
import { SiteSettings } from './globals/SiteSettings'
import { canRunJobs } from './access/canRunJobs'
import { cloudflareEmailAdapter } from './email/cloudflare-adapter'
import { cloudflareLogger } from './logger'
import type { Config } from './payload-types'

declare module 'payload' {
  export interface GeneratedTypes extends Config {}
}

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

// Node-side loads (dev, payload CLI, `next build`) get bindings from
// wrangler's platform proxy; only workerd has the real runtime context.
// Adapted from the official with-cloudflare-d1 template. The obfuscated
// specifier keeps Next's bundler from pulling wrangler into the server build.
// No remoteBindings: unlike the template's D1, our DB is Turso via env vars,
// and nothing reads R2 from Node in production (migrate/build don't touch it).
function getCloudflareContextFromWrangler(): Promise<CloudflareContext> {
  return import(/* webpackIgnore: true */ `${'__wrangler'.replaceAll('_', '')}`).then(
    ({ getPlatformProxy }) =>
      getPlatformProxy({
        environment: process.env.CLOUDFLARE_ENV,
        // Parallel `next build` workers each boot a proxy and deadlock on the
        // shared .wrangler/state SQLite; keep state in memory outside dev.
        persist: process.env.NODE_ENV === 'development' ? undefined : false,
        // Dev talks to the real R2 bucket ("remote": true bindings); tests and
        // CI stay on the local simulation.
        remoteBindings: process.env.NODE_ENV === 'development',
      } satisfies GetPlatformProxyOptions),
  )
}

const isWorkerd = globalThis.navigator?.userAgent === 'Cloudflare-Workers'
const cloudflare = isWorkerd
  ? await getCloudflareContext({ async: true })
  : await getCloudflareContextFromWrangler()

export default buildConfig({
  admin: {
    user: Users.slug,
    components: {
      // Quick draft/published links for Posts, nested in the sidebar.
      afterNavLinks: ['/components/NavPostFilters#NavPostFilters'],
    },
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
  // Enabled only when the send_email binding exists (workerd / wrangler proxy)
  // AND a from address is configured; otherwise Payload falls back to its
  // console adapter, which keeps dev/CLI/build working without email setup.
  email:
    cloudflare.env.EMAIL && process.env.EMAIL_FROM_ADDRESS
      ? cloudflareEmailAdapter({
          binding: cloudflare.env.EMAIL,
          defaultFromAddress: process.env.EMAIL_FROM_ADDRESS,
          defaultFromName: process.env.EMAIL_FROM_NAME || 'Payload CMS',
        })
      : undefined,
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
    // Store media in R2 through the Workers binding; dev/CLI get a local
    // simulation from wrangler (object keys match what storage-s3 wrote).
    r2Storage({
      bucket: cloudflare.env.R2,
      collections: { media: true },
    }),
  ],
})
