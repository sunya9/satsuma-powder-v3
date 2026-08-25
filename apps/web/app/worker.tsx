import { createPreviewApp } from "#preview-app";

// Runtime Worker fronting the static assets. Published pages are pre-rendered
// (SSG) and served straight from `assets`; `run_worker_first` (wrangler.jsonc)
// routes only /preview/* here, so the Worker IS the preview app. __STYLE_HREF__
// is the hashed stylesheet injected by the worker vite build.
export default createPreviewApp(__STYLE_HREF__);
