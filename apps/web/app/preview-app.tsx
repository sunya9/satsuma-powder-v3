import { Hono } from "hono";
import { getCookie, setCookie } from "hono/cookie";
import { raw } from "hono/html";
import { type Post, type Site } from "#lib/payload";
import { createPreviewClient } from "#lib/preview-client";
import { previewSecretMatches } from "#lib/preview";
import { verifyPreviewToken } from "#lib/preview-token";
import { PostMain } from "#components/PostMain";
import { SiteBody } from "#components/SiteBody";

const PREVIEW_COOKIE = "preview_secret";
const PREVIEW_PATH = "/preview";

const PAYLOAD_URL = (import.meta.env.VITE_PAYLOAD_URL ?? "http://localhost:3000").replace(
  /\/$/,
  "",
);

export function createPreviewApp(styleHref: string) {
  const app = new Hono<{ Bindings: Env }>();

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
