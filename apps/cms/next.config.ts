import { withPayload } from '@payloadcms/next/withPayload'
import type { NextConfig } from 'next'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(__filename)

const nextConfig: NextConfig = {
  images: {
    localPatterns: [
      {
        pathname: '/api/media/file/**',
      },
    ],
  },
  // Packages with workerd-specific export conditions must stay external so
  // OpenNext's bundler picks their Workers build (see opennext.js.org/cloudflare/howtos/workerd).
  // @libsql/client resolves to its fetch-based web client on workerd, which is
  // how the Turso (libsql://) connection works without native bindings.
  serverExternalPackages: ['jose', '@libsql/client'],
  // File tracing resolves with node conditions only, so the workerd variants
  // (web.mjs etc.) of @libsql packages get dropped; include them explicitly
  // or OpenNext's bundler fails resolving them.
  outputFileTracingIncludes: {
    '/**': ['../../node_modules/.pnpm/@libsql+*/**/*.{mjs,cjs,js,json}'],
  },
  webpack: (webpackConfig) => {
    webpackConfig.resolve.extensionAlias = {
      '.cjs': ['.cts', '.cjs'],
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
      '.mjs': ['.mts', '.mjs'],
    }

    return webpackConfig
  },
  turbopack: {
    // Monorepo root (where pnpm-lock.yaml and the hoisted node_modules live)
    root: path.resolve(dirname, '../..'),
  },
}

export default withPayload(nextConfig, { devBundleServerPackages: false })
