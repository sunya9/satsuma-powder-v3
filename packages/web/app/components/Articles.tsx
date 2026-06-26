import { formatDate } from '../lib/date'
import type { PostSummary } from '../lib/payload'

interface Props {
  posts: PostSummary[]
  withoutYear?: boolean
}

/** 記事リスト（年別一覧・最近の投稿で共用）。 */
export function Articles({ posts, withoutYear }: Props) {
  return (
    <ul role="feed" aria-busy="false" class="list-none pl-0">
      {posts.map((post, index) => (
        <li
          role="article"
          aria-posinset={index + 1}
          aria-setsize={posts.length}
          aria-labelledby={String(post.id)}
          class="border-line [&:not(:first-child)]:border-t"
        >
          <a href={`/blog/${post.slug}`} id={String(post.id)} class="block py-3 no-underline">
            {post.publishedAt && (
              <time datetime={post.publishedAt} class="block text-muted">
                {formatDate(post.publishedAt, withoutYear)}
              </time>
            )}
            {post.title}
          </a>
        </li>
      ))}
    </ul>
  )
}
