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
    const post = await payloadRepo.getPost(c.req.param('slug'))
    if (!post) return c.notFound()
    const png = await ogPng({
      title: post.title,
      subtitle: post.publishedAt ? formatDate(post.publishedAt) : '',
    })
    return c.body(png, 200, { 'Content-Type': 'image/png' })
  },
)
