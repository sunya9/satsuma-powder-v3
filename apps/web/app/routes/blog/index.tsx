import { createRoute } from "honox/factory";
import { Articles } from "#components/Articles";
import { getYearJST } from "#lib/date";
import { payloadRepo, type PostSummary } from "#lib/payload";
import { AppHeader, AppHeaderTitle } from "#components/AppHeader";
import { AppMain } from "#components/AppMain";

export default createRoute(async (c) => {
  // posts are publishedAt-desc, so Map insertion order is already year-desc.
  const posts = await payloadRepo.getPosts();
  const byYear = new Map<number, PostSummary[]>();
  for (const post of posts) {
    if (!post.publishedAt) continue;
    const year = getYearJST(post.publishedAt);
    const list = byYear.get(year) ?? [];
    list.push(post);
    byYear.set(year, list);
  }

  return c.render(
    <>
      <AppHeader>
        <AppHeaderTitle>全ての投稿</AppHeaderTitle>
        <p>現在{posts.length}件の記事があります。</p>
      </AppHeader>
      <AppMain>
        {[...byYear.entries()].map(([year, yearPosts]) => {
          const yearId = `year-${year}`;
          return (
            <section aria-labelledby={yearId} class="relative">
              <h2
                id={yearId}
                class="sticky top-0 pt-4 mt-4 text-3xl font-normal text-strong bg-paper z-10"
              >
                {year}年 <small class="text-base">{yearPosts.length}件</small>
              </h2>
              <Articles posts={yearPosts} class="my-4" withoutYear />
            </section>
          );
        })}
      </AppMain>
    </>,
    { title: "全ての投稿", path: "/blog" },
  );
});
