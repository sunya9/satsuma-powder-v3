import { sqliteAdapter } from '@payloadcms/db-sqlite'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { seoPlugin } from '@payloadcms/plugin-seo'
import { s3Storage } from '@payloadcms/storage-s3'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

import { Users } from './collections/Users'
import { Media } from './collections/Media'
import { Posts } from './collections/Posts'
import { Tags } from './collections/Tags'
import { Authors } from './collections/Authors'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  collections: [Users, Media, Posts, Tags, Authors],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: sqliteAdapter({
    client: {
      url: process.env.DATABASE_URL || '',
      // 本番は Turso (libsql) を利用する想定。libsql://… のリモートDBには認証トークンが必要。
      // ローカルの file: DB では未設定でよい。
      authToken: process.env.DATABASE_AUTH_TOKEN,
    },
  }),
  sharp,
  plugins: [
    seoPlugin({
      collections: ['posts'],
      uploadsCollection: 'media',
      tabbedUI: true,
      generateTitle: ({ doc }) => (doc?.title as string) ?? '',
      generateDescription: ({ doc }) => (doc?.excerpt as string) ?? '',
    }),
    // media コレクションのアップロード先を S3 / Cloudflare R2 にする。
    // 本番(Vercel)は FS が ephemeral なため必須。env が未設定のローカルでは無効化され、
    // 既定のローカルディスク(media/)へフォールバックする。
    s3Storage({
      enabled: Boolean(process.env.S3_BUCKET),
      collections: { media: true },
      bucket: process.env.S3_BUCKET || '',
      config: {
        // R2 のエンドポイント例: https://<accountid>.r2.cloudflarestorage.com
        endpoint: process.env.S3_ENDPOINT,
        // R2 は region 'auto'。S3 は実リージョン。
        region: process.env.S3_REGION || 'auto',
        // R2 / 多くの S3 互換ストレージは path-style が必要。
        forcePathStyle: true,
        credentials: {
          accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
          secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
        },
      },
    }),
  ],
})
