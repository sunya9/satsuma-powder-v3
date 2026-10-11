import { Hono } from "hono";
import { getCookie, setCookie } from "hono/cookie";
import { raw } from "hono/html";
import {
  createPayloadClient,
  PAYLOAD_URL,
  type PayloadClient,
  type Post,
  type Site,
} from "#lib/payload-client";
import { previewCookieMaxAge } from "#lib/preview-cookie";
import { PostMain } from "#components/PostMain";
import { SiteBody } from "#components/SiteBody";

const PREVIEW_COOKIE = "preview_token";
const PREVIEW_PATH = "/preview";

type PreviewEnv = { Bindings: Env; Variables: { payload: PayloadClient } };

export function createPreviewApp(styleHref: string) {
  const app = new Hono<PreviewEnv>();

  // Every route here needs the CMS client. In dev this app is mounted after the
  // honox page routes, so the middleware never runs for a page that already matched.
  app.use(async (c, next) => {
    const apiKey = c.env.PAYLOAD_API_KEY;
    if (!apiKey) return c.text("Preview is not configured", 500);
    c.set("payload", createPayloadClient({ payloadUrl: PAYLOAD_URL, apiKey }));
    await next();
  });

  app.get("/preview", async (c) => {
    const slug = c.req.query("slug");
    const token = c.req.query("token");
    if (!slug || !token) return c.notFound();
    if (!(await c.var.payload.verifyPreviewToken({ slug, token }))) return c.notFound();

    // Only the slug-bound token goes in the cookie; it's re-verified per request.
    setCookie(c, PREVIEW_COOKIE, token, {
      httpOnly: true,
      // Dropped over plain http so the localhost dev servers can set it too.
      secure: new URL(c.req.url).protocol === "https:",
      sameSite: "Lax",
      path: PREVIEW_PATH,
      maxAge: previewCookieMaxAge(token, Date.now()),
    });
    return c.redirect(`/preview/blog/${encodeURIComponent(slug)}`, 302);
  });

  app.get("/preview/blog/:slug", async (c) => {
    // Only reachable with the cookie set by /preview above; direct hits 404 so
    // drafts don't even reveal their existence.
    const token = getCookie(c, PREVIEW_COOKIE);
    if (!token) return c.notFound();

    const client = c.var.payload;
    const slug = c.req.param("slug");
    if (!(await client.verifyPreviewToken({ slug, token }))) return c.notFound();

    const [post, site] = await Promise.all([client.draftPost(slug), client.site()]);
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
