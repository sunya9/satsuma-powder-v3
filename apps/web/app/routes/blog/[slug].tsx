import { ssgParams } from "hono/ssg";
import { createRoute } from "honox/factory";
import { config } from "#lib/config";
import { contentHash } from "#lib/hash";
import { payloadRepo } from "#lib/payload";
import { PostMain } from "#components/PostMain";

export default createRoute(
  ssgParams(async () => {
    const posts = await payloadRepo.getPosts();
    return posts.map((post) => ({ slug: post.slug }));
  }),
  async (c) => {
    const slug = c.req.param("slug");
    if (!slug) return c.notFound();
    const post = await payloadRepo.getPost(slug);
    if (!post) return c.notFound();

    const [olderPost, newerPost] = await Promise.all([
      payloadRepo.getOlderPost(post.publishedAt).catch(() => undefined),
      payloadRepo.getNewerPost(post.publishedAt).catch(() => undefined),
    ]);

    return c.render(
      <PostMain post={post} olderPost={olderPost} newerPost={newerPost} />,
      {
        title: post.title,
        description: post.excerpt ?? undefined,
        path: `/blog/${post.slug}`,
        type: "article",
        image: `${config.url}/blog/${post.slug}/opengraph-image.png?${contentHash(post.title + (post.publishedAt ?? ""))}`,
      },
    );
  },
);
