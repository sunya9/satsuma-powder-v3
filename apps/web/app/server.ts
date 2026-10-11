import { showRoutes } from "hono/dev";
import { createApp } from "honox/server";
import type { AppEnv } from "#lib/app-env";
import { readEnv } from "#lib/env";
import { createPayloadClient } from "#lib/payload-client";
import { createPayloadRepo } from "#lib/payload";
import { createPreviewApp } from "#preview-app";

const env = readEnv(process.env);

// Read at build time only; vite.config.ts never inlines the key into a bundle.
const payload = createPayloadRepo(
  createPayloadClient({ payloadUrl: env.payloadUrl, apiKey: process.env.PAYLOAD_API_KEY }),
);

const app = createApp<AppEnv>({
  init(app) {
    app.use(async (c, next) => {
      c.set("env", env);
      c.set("payload", payload);
      await next();
    });
  },
});

// Dev-only: mount the draft-preview routes so `pnpm dev` (the honox dev server)
// can exercise /preview with HMR. Production serves them from the separate Worker
// bundle (worker.tsx); the SSG build strips this branch (import.meta.env.DEV).
// Secrets resolve exactly like production — from `c.env`, populated out of
// .dev.vars by the cloudflare dev-server adapter (see vite.config.ts).
if (import.meta.env.DEV) {
  app.route("/", createPreviewApp({ styleHref: "/app/style.css", env }));
}

showRoutes(app);

export default app;
