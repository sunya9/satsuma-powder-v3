import { showRoutes } from "hono/dev";
import { createApp } from "honox/server";
import { createPreviewApp } from "#preview-app";

const app = createApp();

// Dev-only: mount the draft-preview routes so `pnpm dev` (the honox dev server)
// can exercise /preview with HMR. Production serves them from the separate Worker
// bundle (worker.tsx); the SSG build strips this branch (import.meta.env.DEV).
// Secrets resolve exactly like production — from `c.env`, populated out of
// .dev.vars by the cloudflare dev-server adapter (see vite.config.ts).
if (import.meta.env.DEV) {
  app.route("/", createPreviewApp("/app/style.css"));
}

showRoutes(app);

export default app;
