import ssg from '@hono/vite-ssg'
import tailwindcss from '@tailwindcss/vite'
import type { SSGPlugin } from 'hono/ssg'
import honox from 'honox/vite'
import { defineConfig } from 'vite'

const entry = './app/server.ts'

// Fail the build when any route renders as an error (e.g. the CMS is
// unreachable). hono/ssg otherwise saves the error body as page content and
// exits 0, silently deploying an empty site. Every legit page here renders
// 200 (even /404), so non-ok always means a broken build.
const failOnErrorResponse: SSGPlugin = {
  afterResponseHook: (response) => {
    if (!response.ok) {
      throw new Error(`SSG render returned HTTP ${response.status}`)
    }
    return response
  },
}

export default defineConfig({
  // Keep the client build output; the ssg build runs second.
  build: { emptyOutDir: false },
  // OG image deps: @resvg/resvg-js is native, and satori pulls in CJS deps
  // (unicode-trie) that break Vite's ESM transform. Load both as Node externals.
  ssr: { external: ['@resvg/resvg-js', 'satori'] },
  plugins: [
    // Default Node dev server: the prod output is static (SSG), so the dev
    // runtime need not match Workers, and native modules work for OG rendering.
    honox({ client: { input: ['/app/client.ts', '/app/style.css'] } }),
    tailwindcss(),
    ssg({ entry, plugins: [failOnErrorResponse] }),
  ],
})
