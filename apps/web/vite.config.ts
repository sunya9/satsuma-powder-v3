import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import cloudflareWorkers from "@hono/vite-build/cloudflare-workers";
import ssg from "@hono/vite-ssg";
import tailwindcss from "@tailwindcss/vite";
import type { SSGPlugin } from "hono/ssg";
import honox from "honox/vite";
import { defineConfig } from "vite";

const entry = "./app/server.ts";

// Fail the build when any route renders as an error (e.g. the CMS is
// unreachable). hono/ssg otherwise saves the error body as page content and
// exits 0, silently deploying an empty site. Every legit page here renders
// 200 (even /404), so non-ok always means a broken build.
const failOnErrorResponse: SSGPlugin = {
  afterResponseHook: (response) => {
    if (!response.ok) {
      throw new Error(`SSG render returned HTTP ${response.status}`);
    }
    return response;
  },
};

// The preview page must load the same hashed stylesheet as the static site.
// The client build (run first) records it in the Vite manifest.
function builtStyleHref(): string {
  const manifestUrl = new URL("./dist/.vite/manifest.json", import.meta.url);
  const manifest = JSON.parse(readFileSync(fileURLToPath(manifestUrl), "utf8"));
  return `/${manifest["app/style.css"].file}`;
}

export default defineConfig(({ mode }) => {
  // Third build target: the runtime Worker that serves the preview route and
  // proxies everything else to the static assets. Kept separate from the SSG
  // build so it excludes the OG routes (native satori/resvg don't run on
  // Workers) and outputs a standalone worker bundle.
  if (mode === "worker") {
    return {
      define: { __STYLE_HREF__: JSON.stringify(builtStyleHref()) },
      plugins: [
        cloudflareWorkers({
          entry: "./app/worker.tsx",
          output: "index.js",
          outputDir: "./dist-worker",
        }),
      ],
    };
  }

  return {
    // Keep the client build output; the ssg build runs second.
    build: { emptyOutDir: false },
    // OG image deps: @resvg/resvg-js is native, and satori pulls in CJS deps
    // (unicode-trie) that break Vite's ESM transform. Load both as Node externals.
    ssr: { external: ["@resvg/resvg-js", "satori"] },
    plugins: [
      // Default Node dev server: the prod output is static (SSG), so the dev
      // runtime need not match Workers, and native modules work for OG rendering.
      honox({ client: { input: ["/app/client.ts", "/app/style.css"] } }),
      tailwindcss(),
      ssg({ entry, plugins: [failOnErrorResponse] }),
    ],
  };
});
