import { jsxRenderer } from "hono/jsx-renderer";
import { Link } from "honox/server";
import { config } from "#lib/config";
import { contentHash } from "#lib/hash";
import { getSite } from "#lib/payload";
import { LinkButton } from "#components/LinkButton";
import { Hr } from "#components/Hr";
import { html } from "hono/html";

export default jsxRenderer(
  async ({ children, title, description, path, image, type }) => {
    const site = await getSite();
    const pageTitle =
      title && title !== site.title ? `${title} | ${site.title}` : site.title;
    const desc = description ?? site.description;
    const url = `${config.url}${path ?? ""}`;
    const ogImage =
      image ??
      `${config.url}/opengraph-image.png?${contentHash(site.title + site.description)}`;
    const ogType = type ?? "website";
    const isIndex = !path;
    return (
      <html lang="ja">
        <head>
          {import.meta.env.PROD &&
            html`
              <script
                async
                src="https://www.googletagmanager.com/gtag/js?id=G-QTR9Z69TYK"
              ></script>
              <script>
                window.dataLayer = window.dataLayer || [];
                function gtag() {
                  dataLayer.push(arguments);
                }
                gtag("js", new Date());

                gtag("config", "G-QTR9Z69TYK");
              </script>
            `}
          <meta charset="utf-8" />
          <meta
            name="viewport"
            content="width=device-width, initial-scale=1.0"
          />
          <title>{pageTitle}</title>
          <meta name="description" content={desc} />
          <link rel="canonical" href={url} />
          <link
            rel="alternate"
            type="application/rss+xml"
            href={`${config.url}/rss.xml`}
            title={`${site.title}のRSS`}
          />

          <meta property="og:title" content={pageTitle} />
          <meta property="og:description" content={desc} />
          <meta property="og:url" content={url} />
          <meta property="og:site_name" content={site.title} />
          <meta property="og:image" content={ogImage} />
          <meta property="og:image:type" content="image/png" />
          <meta property="og:image:width" content="1200" />
          <meta property="og:image:height" content="630" />
          <meta property="og:type" content={ogType} />

          <meta name="twitter:card" content="summary_large_image" />
          <meta name="twitter:title" content={pageTitle} />
          <meta name="twitter:description" content={desc} />
          <meta name="twitter:image" content={ogImage} />

          {site.iconUrl && <link rel="icon" href={site.iconUrl} />}
          <Link href="/app/style.css" rel="stylesheet" />
          <style>{"@view-transition { navigation: auto }"}</style>
          <meta name="text-scale" content="scale" />
          <meta name="color-scheme" content="light" />
          <meta name="theme-color" content="hsl(26 54% 19%)" />
        </head>
        <body class="bg-paper text-ink">
          {children}
          <footer class="my-20 text-muted">
            <div class="site-container space-y-4">
              {!isIndex && (
                <p>
                  <LinkButton href="/">ホームに戻る</LinkButton>
                </p>
              )}
              <Hr />
              <p>
                ©&nbsp;
                <a
                  class="text-link"
                  href={`https://twitter.com/${site.twitterHandle}`}
                >
                  @{site.twitterHandle}
                </a>
              </p>
            </div>
          </footer>
        </body>
      </html>
    );
  },
);
