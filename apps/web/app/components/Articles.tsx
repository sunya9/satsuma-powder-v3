import { formatDate } from "#lib/date";
import type { PostSummary } from "#lib/payload";

interface Props {
  posts: PostSummary[];
  withoutYear?: boolean;
  class?: string;
}

export function Articles({ posts, withoutYear, class: className }: Props) {
  return (
    <ul role="feed" aria-busy="false" class={className}>
      {posts.map((post, index) => (
        <li
          role="article"
          aria-posinset={index + 1}
          aria-setsize={posts.length}
          aria-labelledby={String(post.id)}
          class="block py-3"
        >
          {post.publishedAt && (
            <time
              datetime={post.publishedAt}
              class="block text-muted"
              style={{
                viewTransitionName: `post-${post.id}-date`,
              }}
            >
              {formatDate(post.publishedAt, withoutYear)}
            </time>
          )}
          <a
            href={`/blog/${post.slug}`}
            style={{
              viewTransitionName: `post-${post.id}-title`,
            }}
            class="text-link"
          >
            {post.title}
          </a>
        </li>
      ))}
    </ul>
  );
}
