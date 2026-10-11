import { ssgParams } from "hono/ssg";
import { type AppEnv, createRoute } from "#lib/app-env";
import { contentHash } from "#lib/hash";
import { PostMain } from "#components/PostMain";

export default createRoute(
  ssgParams<AppEnv>(async (c) => {
    const posts = await c.var.payload.getPosts();
    return posts.map((post) => ({ slug: post.slug }));
  }),
  async (c) => {
    const slug = c.req.param("slug");
    if (!slug) return c.notFound();
    const post = await c.var.payload.getPost(slug);
    if (!post) return c.notFound();

    const [olderPost, newerPost] = await Promise.all([
      c.var.payload.getOlderPost(post.publishedAt).catch(() => undefined),
      c.var.payload.getNewerPost(post.publishedAt).catch(() => undefined),
    ]);

    return c.render(<PostMain post={post} olderPost={olderPost} newerPost={newerPost} />, {
      title: post.title,
      description: post.excerpt ?? undefined,
      path: `/blog/${post.slug}`,
      type: "article",
      image: `${c.var.env.siteUrl}/blog/${post.slug}/opengraph-image.png?${contentHash(post.title + (post.publishedAt ?? ""))}`,
    });
  },
);
