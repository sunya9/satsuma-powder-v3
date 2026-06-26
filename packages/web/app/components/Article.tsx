import { formatDate } from '../lib/date'
import { LexicalContent } from '../lib/lexical'
import type { Post, PostSummary } from '../lib/payload'

interface Props {
  post: Post
  olderPost?: PostSummary
  newerPost?: PostSummary
}

const NAV_LINK = 'block border border-line p-3 no-underline'

export function Article({ post, olderPost, newerPost }: Props) {
  const hasRelated = Boolean(olderPost || newerPost)
  return (
    <article aria-label={post.title}>
      <LexicalContent state={post.content} />

      {hasRelated && (
        <nav aria-label="前後の記事" class="my-8 grid grid-cols-2 gap-2">
          {newerPost ? (
            <a href={`/blog/${newerPost.slug}`} class={NAV_LINK}>
              <span class="block text-muted">
                {newerPost.publishedAt && (
                  <time datetime={newerPost.publishedAt}>{formatDate(newerPost.publishedAt)}</time>
                )}
              </span>
              {newerPost.title}
            </a>
          ) : (
            <span />
          )}
          {olderPost && (
            <a href={`/blog/${olderPost.slug}`} class={`${NAV_LINK} text-right`}>
              <span class="block text-muted">
                {olderPost.publishedAt && (
                  <time datetime={olderPost.publishedAt}>{formatDate(olderPost.publishedAt)}</time>
                )}
              </span>
              {olderPost.title}
            </a>
          )}
        </nav>
      )}
    </article>
  )
}
