import { createRoute } from 'honox/factory'
import { config } from '../lib/config'
import { lexicalToHtml } from '../lib/lexical-html'
import { mediaUrl, payloadRepo } from '../lib/payload'

const cdata = (s?: string | null) =>
  `<![CDATA[${String(s ?? '').replace(/\]\]>/g, ']]]]><![CDATA[>')}]]>`
const attr = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;')

export default createRoute(async (c) => {
  const posts = await payloadRepo.getRecentFull(15)

  const items = posts
    .map((post) => {
      const link = `${config.url}/blog/${post.slug}`
      const image = mediaUrl(post.featureImage)
      const author = post.authors?.[0]?.name ?? ''
      const category = post.tags?.[0]?.name ?? ''
      return (
        '<item>' +
        `<title>${cdata(post.title)}</title>` +
        (post.excerpt ? `<description>${cdata(post.excerpt)}</description>` : '') +
        `<link>${link}</link>` +
        `<guid isPermaLink="false">${post.id}</guid>` +
        (category ? `<category>${cdata(category)}</category>` : '') +
        (author ? `<dc:creator>${cdata(author)}</dc:creator>` : '') +
        (post.publishedAt ? `<pubDate>${new Date(post.publishedAt).toUTCString()}</pubDate>` : '') +
        (image ? `<media:content url="${attr(image)}" medium="image"/>` : '') +
        `<content:encoded>${cdata(lexicalToHtml(post.content))}</content:encoded>` +
        '</item>'
      )
    })
    .join('')

  const xml =
    '<?xml version="1.0" encoding="UTF-8"?>' +
    '<rss xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:atom="http://www.w3.org/2005/Atom" version="2.0" xmlns:media="http://search.yahoo.com/mrss/">' +
    '<channel>' +
    `<title>${cdata(config.title)}</title>` +
    `<description>${cdata(config.description)}</description>` +
    `<link>${config.url}/</link>` +
    `<image><url>${config.icon}</url><title>${cdata(config.title)}</title><link>${config.url}/</link></image>` +
    '<generator>HonoX</generator>' +
    `<atom:link href="${config.url}/rss.xml" rel="self" type="application/rss+xml"/>` +
    '<ttl>60</ttl>' +
    items +
    '</channel></rss>'

  return c.body(xml, 200, { 'Content-Type': 'application/rss+xml; charset=utf-8' })
})
