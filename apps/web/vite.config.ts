import ssg from '@hono/vite-ssg'
import tailwindcss from '@tailwindcss/vite'
import honox from 'honox/vite'
import { defineConfig } from 'vite'

const entry = './app/server.ts'

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
    ssg({ entry }),
  ],
})
