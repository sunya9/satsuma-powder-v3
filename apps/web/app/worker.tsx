import { readEnv } from "#lib/env";
import { createPreviewApp } from "#preview-app";

// `process.env` here is the object inlined by the worker vite build.
const env = readEnv(process.env);

// Runtime Worker fronting the static assets. Published pages are pre-rendered
// (SSG) and served straight from `assets`; `run_worker_first` (wrangler.jsonc)
// routes only /preview/* here, so the Worker IS the preview app. __STYLE_HREF__
// is the hashed stylesheet injected by the worker vite build.
export default createPreviewApp({ styleHref: __STYLE_HREF__, env });
