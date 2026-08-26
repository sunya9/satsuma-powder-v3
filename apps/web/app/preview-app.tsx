import { Hono } from "hono";
import { getCookie, setCookie } from "hono/cookie";
import { raw } from "hono/html";
import { type Post, type Site } from "#lib/payload";
import { createPreviewClient } from "#lib/preview-client";
import { previewSecretMatches } from "#lib/preview";
import { verifyPreviewToken } from "#lib/preview-token";
import { PostMain } from "#components/PostMain";
import { SiteBody } from "#components/SiteBody";

// Draft-mode cookie: holds the shared secret so it never rides in the URL after
// the initial redirect. Path-scoped to /preview so it's sent nowhere else.
const PREVIEW_COOKIE = "preview_secret";
const PREVIEW_PATH = "/preview";

// Both hosts (the production Worker and the honox dev server via the cloudflare
// adapter) expose the preview secrets as Workers bindings on `c.env`. Variables
// is required by the hono Env augmentation in global.d.ts.
type PreviewEnv = { Bindings: Env; Variables: {} };

// Inlined at build time by Vite; not secret (the CMS URL is public knowledge).
const PAYLOAD_URL = (import.meta.env.VITE_PAYLOAD_URL ?? "http://localhost:3000").replace(
  /\/$/,
  "",
);

// Builds the draft-preview routes as a self-contained typed sub-app: the
// production Worker exports it as-is, the dev server mounts it via app.route().
// Only styleHref differs per host: a hashed asset path in the built worker vs.
// Vite's /app/style.css during dev.
export function createPreviewApp(styleHref: string) {
  const app = new Hono<PreviewEnv>();

  // Enable endpoint (Next.js draft-mode equivalent): the CMS preview button lands
  // here with ?slug&token. The token is a short-lived, slug-bound HMAC (safe to
  // carry in the URL); on success we move the long-lived secret into an httpOnly
  // cookie and 302 to the clean content URL, so no reusable secret is ever in a
  // URL, browser history, or access log.
  app.get("/preview", async (c) => {
    const secret = c.env.PREVIEW_SECRET;
    const slug = c.req.query("slug");
    if (!slug) return c.notFound();
    const valid = await verifyPreviewToken({
      token: c.req.query("token"),
      slug,
      secret,
      now: Date.now(),
    });
    if (!valid) return c.notFound();

    setCookie(c, PREVIEW_COOKIE, secret, {
      httpOnly: true,
      // Dropped over plain http so the localhost dev servers can set it too.
      secure: new URL(c.req.url).protocol === "https:",
      sameSite: "Lax",
      path: PREVIEW_PATH,
      maxAge: 60 * 60,
    });
    return c.redirect(`/preview/blog/${encodeURIComponent(slug)}`, 302);
  });

  app.get("/preview/blog/:slug", async (c) => {
    // Only reachable with the cookie set by /preview above; direct hits 404 so
    // drafts don't even reveal their existence.
    if (!previewSecretMatches(getCookie(c, PREVIEW_COOKIE), c.env.PREVIEW_SECRET))
      return c.notFound();
    const apiKey = c.env.PAYLOAD_API_KEY;
    if (!apiKey) return c.text("Preview is not configured", 500);

    const client = createPreviewClient({ payloadUrl: PAYLOAD_URL, apiKey });
    const [post, site] = await Promise.all([
      client.getDraftPost(c.req.param("slug")),
      client.getSite(),
    ]);
    if (!post) return c.notFound();

    return c.html(
      <>
        {raw("<!doctype html>")}
        <PreviewDocument site={site} post={post} styleHref={styleHref} />
      </>,
    );
  });

  return app;
}

function PreviewDocument({ site, post, styleHref }: { site: Site; post: Post; styleHref: string }) {
  return (
    <html lang="ja">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        {/* Drafts must never be indexed or leak their URL via analytics. */}
        <meta name="robots" content="noindex,nofollow" />
        <title>
          {post.title}（プレビュー）| {site.title}
        </title>
        <link rel="stylesheet" href={styleHref} />
        <meta name="color-scheme" content="light" />
      </head>
      <SiteBody site={site}>
        <p class="bg-strong text-paper text-center text-sm py-2">
          プレビュー表示（下書き・未公開）
        </p>
        <PostMain post={post} />
      </SiteBody>
    </html>
  );
}
