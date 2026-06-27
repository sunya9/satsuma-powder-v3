import { ssgParams } from 'hono/ssg'
import { createRoute } from 'honox/factory'
import { formatDate } from '../../../lib/date'
import { ogPng } from '../../../lib/og'
import { payloadRepo } from '../../../lib/payload'

export default createRoute(
  ssgParams(async () => {
    const posts = await payloadRepo.getPosts()
    return posts.map((post) => ({ slug: post.slug }))
  }),
  async (c) => {
    const slug = c.req.param('slug')
    if (!slug) return c.notFound()
    const post = await payloadRepo.getPost(slug)
    if (!post) return c.notFound()
    const png = await ogPng({
      title: post.title,
      subtitle: post.publishedAt ? formatDate(post.publishedAt) : '',
    })
    return new Response(png, { headers: { 'Content-Type': 'image/png' } })
  },
)
