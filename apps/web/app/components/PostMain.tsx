import type { JSX } from "hono/jsx";
import { formatDate } from "#lib/date";
import { LexicalContent } from "#lib/lexical";
import { mediaUrl, type Post, type PostSummary } from "#lib/payload";
import { cn } from "#lib/util";
import { AppMain } from "#components/AppMain";

// The whole <main> of a post page: the article plus the prev/next navigation.
// Shared by the published route (routes/blog/[slug].tsx) and the draft preview
// (worker.tsx). The preview passes no neighbors, so the nav simply doesn't render.
export function PostMain({
  post,
  olderPost,
  newerPost,
}: {
  post: Post;
  olderPost?: PostSummary;
  newerPost?: PostSummary;
}) {
  const hasRelated = Boolean(olderPost || newerPost);
  return (
    <AppMain>
      <article>
        <header>
          {post.featureImage && (
            <img
              src={mediaUrl(post.featureImage)}
              alt={post.featureImage.alt || undefined}
              class="object-cover aspect-[1.618/1] h-auto w-full mb-8"
              width={post.featureImage.width || undefined}
              height={post.featureImage.height || undefined}
              fetchpriority="high"
            />
          )}
          {post.publishedAt && (
            <time
              datetime={post.publishedAt}
              class="mt-2 text-muted tabular-nums text-sm"
              style={{ viewTransitionName: `post-${post.id}-date` }}
            >
              {formatDate(post.publishedAt)}
            </time>
          )}
          <h1
            class="text-4xl mt-1 text-strong"
            style={{ viewTransitionName: `post-${post.id}-title` }}
          >
            {post.title}
          </h1>
        </header>
        <LexicalContent class="mt-4" state={post.content} />
      </article>
      {hasRelated && (
        <nav aria-label="前後の記事" class="mt-8 grid grid-cols-2 gap-2">
          {newerPost && <NavLink post={newerPost} class="col-start-1" rel="prev" />}
          {olderPost && (
            <NavLink post={olderPost} class="col-start-2 text-right" rel="next" />
          )}
        </nav>
      )}
      {newerPost && (
        <link rel="prefetch" href={`/blog/${newerPost.slug}`} as="document" />
      )}
      {olderPost && (
        <link rel="prefetch" href={`/blog/${olderPost.slug}`} as="document" />
      )}
    </AppMain>
  );
}

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
