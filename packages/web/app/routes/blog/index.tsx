import { createRoute } from 'honox/factory'
import { AppLayout } from '../../components/AppLayout'
import { Articles } from '../../components/Articles'
import { getYearJST } from '../../lib/date'
import { payloadRepo, type PostSummary } from '../../lib/payload'

export default createRoute(async (c) => {
  // getPosts は publishedAt 降順。年ごとにまとめると Map の挿入順がそのまま年の降順になる。
  const posts = await payloadRepo.getPosts()
  const byYear = new Map<number, PostSummary[]>()
  for (const post of posts) {
    if (!post.publishedAt) continue
    const year = getYearJST(post.publishedAt)
    const list = byYear.get(year) ?? []
    list.push(post)
    byYear.set(year, list)
  }

  return c.render(
    <AppLayout header={{ title: '全ての投稿' }}>
      {[...byYear.entries()].map(([year, yearPosts]) => {
        const yearId = `year-${year}`
        return (
          <section aria-labelledby={yearId}>
            <h2 id={yearId} class="my-[1em] text-[2rem] font-normal text-strong">
              {year}年 <small class="text-[0.7em] font-normal">{yearPosts.length}件</small>
            </h2>
            <Articles posts={yearPosts} withoutYear />
          </section>
        )
      })}
    </AppLayout>,
    { title: '全ての投稿', path: '/blog' },
  )
})
