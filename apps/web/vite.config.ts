import adapter from '@hono/vite-dev-server/cloudflare'
import ssg from '@hono/vite-ssg'
import tailwindcss from '@tailwindcss/vite'
import honox from 'honox/vite'
import { defineConfig } from 'vite'

const entry = './app/server.ts'

export default defineConfig({
  // Keep the client build output; the ssg build runs second.
  build: { emptyOutDir: false },
  plugins: [
    honox({
      devServer: { adapter },
      client: { input: ['/app/client.ts', '/app/style.css'] },
    }),
    tailwindcss(),
    ssg({ entry }),
  ],
})
