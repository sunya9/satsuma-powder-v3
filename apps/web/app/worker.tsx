import { Hono } from "hono";
import { registerPreviewRoutes } from "#preview-app";

// Runtime Worker fronting the static assets. Published pages are pre-rendered
// (SSG) and served straight from `assets`; `run_worker_first` (wrangler.jsonc)
// routes only /preview/* here, so this file is purely the draft-preview handler.
// Bindings come from the generated worker-configuration.d.ts (`wrangler types`).

// Inlined at build time by Vite; not secret (the CMS URL is public knowledge).
const PAYLOAD_URL = (
  import.meta.env.VITE_PAYLOAD_URL ?? "http://localhost:3000"
).replace(/\/$/, "");

const app = new Hono<{ Bindings: Env }>();

// Secrets come from the workerd bindings (c.env); the stylesheet is the hashed
// asset injected by the worker vite build.
registerPreviewRoutes(app, (c) => ({
  payloadUrl: PAYLOAD_URL,
  secret: (c.env as Env).PREVIEW_SECRET,
  apiKey: (c.env as Env).PAYLOAD_API_KEY,
  styleHref: __STYLE_HREF__,
}));

export default app;
