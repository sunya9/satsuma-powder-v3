import { showRoutes } from "hono/dev";
import { createApp } from "honox/server";
import { registerPreviewRoutes } from "#preview-app";

const app = createApp();

// Dev-only: mount the draft-preview routes so `pnpm dev` (the honox Node server)
// can exercise /preview with HMR. Production serves them from the separate Worker
// bundle (worker.tsx); the SSG build strips this branch (import.meta.env.DEV).
// Secrets come from process.env here (no workerd bindings), and the dev server
// serves the stylesheet from Vite at /app/style.css.
if (import.meta.env.DEV) {
  registerPreviewRoutes(app, () => ({
    payloadUrl: (
      import.meta.env.VITE_PAYLOAD_URL ?? "http://localhost:3000"
    ).replace(/\/$/, ""),
    secret: process.env.PREVIEW_SECRET,
    apiKey: process.env.PAYLOAD_API_KEY,
    styleHref: "/app/style.css",
  }));
}

showRoutes(app);

export default app;
