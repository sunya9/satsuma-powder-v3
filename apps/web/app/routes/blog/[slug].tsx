import { ssgParams } from "hono/ssg";
import { createRoute } from "honox/factory";
import { config } from "#lib/config";
import { contentHash } from "#lib/hash";
import { mediaUrl, payloadRepo, type PostSummary } from "#lib/payload";
import { AppMain } from "#components/AppMain";
import { LexicalContent } from "#lib/lexical";
import type { JSX } from "hono/jsx";
import { cn } from "#lib/util";
import { formatDate } from "#lib/date";

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
    const hasRelated = Boolean(olderPost || newerPost);

    return c.render(
      <>
        <AppMain>
          <article>
            <header>
              {post.featureImage && (
                <img
                  src={mediaUrl(post.featureImage)}
                  alt={post.featureImage.alt || undefined}
                  class="object-cover max-h-[calc(var(--container-site)/1.618)] mx-auto w-full mb-8"
                  width={post.featureImage.width || undefined}
                  height={post.featureImage.height || undefined}
                  fetchpriority="high"
                />
              )}
              {post.publishedAt && (
                <time
                  datetime={post.publishedAt}
                  class="mt-2 text-muted tabular-nums text-sm"
                  style={{
                    viewTransitionName: `post-${post.id}-date`,
                  }}
                >
                  {formatDate(post.publishedAt)}
                </time>
              )}
              <h1
                class="text-4xl mt-1 text-strong"
                style={{
                  viewTransitionName: `post-${post.id}-title`,
                }}
              >
                {post.title}
              </h1>
            </header>
            <LexicalContent class="mt-4" state={post.content} />
          </article>
          {hasRelated && (
            <nav aria-label="前後の記事" class="mt-8 grid grid-cols-2 gap-2">
              {newerPost && (
                <NavLink post={newerPost} class="col-start-1" rel="prev" />
              )}
              {olderPost && (
                <NavLink
                  post={olderPost}
                  class="col-start-2 text-right"
                  rel="next"
                />
              )}
            </nav>
          )}
          {newerPost && (
            <link
              rel="prefetch"
              href={`/blog/${newerPost.slug}`}
              as="document"
            />
          )}
          {olderPost && (
            <link
              rel="prefetch"
              href={`/blog/${olderPost.slug}`}
              as="document"
            />
          )}
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

function NavLink({
  class: className,
  post,
  ...props
}: Omit<JSX.IntrinsicElements["a"], "href"> & { post: PostSummary }) {
  return (
    <a
      href={`/blog/${post.slug}`}
      class={cn(
        "block border border-line p-3 no-underline hover:border-cream",
        className,
      )}
      {...props}
    >
      {post.publishedAt && (
        <time
          datetime={post.publishedAt}
          class="tabular-nums block text-muted text-sm"
        >
          {formatDate(post.publishedAt)}
        </time>
      )}
      {post.title}
    </a>
  );
}
