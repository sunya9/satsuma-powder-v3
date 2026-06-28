import { ssgParams } from "hono/ssg";
import { createRoute } from "honox/factory";
import { Article } from "#components/Article";
import { config } from "#lib/config";
import { contentHash } from "#lib/hash";
import { mediaUrl, payloadRepo } from "#lib/payload";
import {
  AppHeader,
  AppHeaderTime,
  AppHeaderTitle,
} from "#components/AppHeader";
import { AppMain } from "#components/AppMain";

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
      <>
        <AppHeader coverImage={post.featureImage?.url}>
          <AppHeaderTitle
            style={{ viewTransitionName: `post-${post.id}-title` }}
          >
            {post.title}
          </AppHeaderTitle>
          <p>{post.excerpt}</p>
          {post.publishedAt && <AppHeaderTime date={post.publishedAt} />}
        </AppHeader>
        <AppMain>
          <Article post={post} olderPost={olderPost} newerPost={newerPost} />
        </AppMain>
      </>,
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
