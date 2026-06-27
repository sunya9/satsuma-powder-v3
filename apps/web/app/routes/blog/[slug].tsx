import { ssgParams } from 'hono/ssg'
import { createRoute } from 'honox/factory'
import { AppLayout } from '../../components/AppLayout'
import { Article } from '../../components/Article'
import { config } from '../../lib/config'
import { mediaUrl, payloadRepo } from '../../lib/payload'

export default createRoute(
  ssgParams(async () => {
    const posts = await payloadRepo.getPosts()
    return posts.map((post) => ({ slug: post.slug }))
  }),
  async (c) => {
  const slug = c.req.param('slug')
  const post = await payloadRepo.getPost(slug)
  if (!post) return c.notFound()

  const [olderPost, newerPost] = await Promise.all([
    payloadRepo.getOlderPost(post.publishedAt).catch(() => undefined),
    payloadRepo.getNewerPost(post.publishedAt).catch(() => undefined),
  ])

  return c.render(
    <AppLayout
      coverImage={mediaUrl(post.featureImage)}
      header={{ title: post.title, date: post.publishedAt, description: post.excerpt }}
    >
      <Article post={post} olderPost={olderPost} newerPost={newerPost} />
    </AppLayout>,
    {
      title: post.title,
      description: post.excerpt ?? undefined,
      path: `/blog/${post.slug}`,
      type: 'article',
      image: `${config.url}/blog/${post.slug}/opengraph-image`,
    },
  )
})
