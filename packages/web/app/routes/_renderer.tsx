import { jsxRenderer } from 'hono/jsx-renderer'
import { Link } from 'honox/server'
import { config } from '../lib/config'

// クライアント JS は載せない（islands 不使用・サーバー描画のみ）。
export default jsxRenderer(({ children, title, description, path, image, type }) => {
  const pageTitle = title && title !== config.title ? `${title} | ${config.title}` : config.title
  const desc = description ?? config.description
  const url = `${config.url}${path ?? ''}`
  const ogImage = image ?? `${config.url}/opengraph-image`
  const ogType = type ?? 'website'

  return (
    <html lang="ja">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{pageTitle}</title>
        <meta name="description" content={desc} />
        <link rel="canonical" href={url} />
        <link
          rel="alternate"
          type="application/rss+xml"
          href={`${config.url}/rss.xml`}
          title={`${config.title}のRSS`}
        />

        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={desc} />
        <meta property="og:url" content={url} />
        <meta property="og:site_name" content={config.title} />
        <meta property="og:image" content={ogImage} />
        <meta property="og:image:type" content="image/png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:type" content={ogType} />

        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={pageTitle} />
        <meta name="twitter:description" content={desc} />
        <meta name="twitter:image" content={ogImage} />

        <link rel="icon" href={config.icon} />
        <Link href="/app/style.css" rel="stylesheet" />
      </head>
      <body class="bg-paper text-ink">{children}</body>
    </html>
  )
})
