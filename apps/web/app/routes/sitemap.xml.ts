import { createRoute } from 'honox/factory'
import { config } from '#lib/config'
import { payloadRepo } from '#lib/payload'

export default createRoute(async (c) => {
  const posts = await payloadRepo.getPosts()
  const latest = posts[0]?.publishedAt

  const urls = [
    { loc: config.url, lastmod: latest },
    { loc: `${config.url}/blog`, lastmod: latest },
    ...posts.map((p) => ({ loc: `${config.url}/blog/${p.slug}`, lastmod: p.publishedAt })),
  ]

  const body = urls
    .map(
      (u) =>
        `<url><loc>${u.loc}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}<changefreq>weekly</changefreq></url>`,
    )
    .join('\n')

  const xml =
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    body +
    '\n</urlset>'

  return c.body(xml, 200, { 'Content-Type': 'application/xml; charset=utf-8' })
})
