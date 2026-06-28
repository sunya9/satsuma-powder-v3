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
      </AppHeader>
      <AppMain>
        {[...byYear.entries()].map(([year, yearPosts]) => {
          const yearId = `year-${year}`;
          return (
            <section aria-labelledby={yearId}>
              <h2
                id={yearId}
                class="my-[1em] text-[2rem] font-normal text-strong"
              >
                {year}年{" "}
                <small class="text-[0.7em] font-normal">
                  {yearPosts.length}件
                </small>
              </h2>
              <Articles posts={yearPosts} withoutYear />
            </section>
          );
        })}
      </AppMain>
    </>,
    { title: "全ての投稿", path: "/blog" },
  );
});
