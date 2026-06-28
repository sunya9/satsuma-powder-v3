import { formatDate } from "#lib/date";
import type { PostSummary } from "#lib/payload";

interface Props {
  posts: PostSummary[];
  withoutYear?: boolean;
}

export function Articles({ posts, withoutYear }: Props) {
  return (
    <ul role="feed" aria-busy="false" class="list-none pl-0">
      {posts.map((post, index) => (
        <li
          role="article"
          aria-posinset={index + 1}
          aria-setsize={posts.length}
          aria-labelledby={String(post.id)}
          class="border-line divide-y"
        >
          <a href={`/blog/${post.slug}`} class="block py-3 no-underline">
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
            <span
              style={{
                viewTransitionName: `post-${post.id}-title`,
              }}
            >
              {post.title}
            </span>
          </a>
        </li>
      ))}
    </ul>
  );
}
