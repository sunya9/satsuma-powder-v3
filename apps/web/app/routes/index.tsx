import { createRoute } from "honox/factory";
import { Articles } from "#components/Articles";
import { LexicalContent } from "#lib/lexical";
import { getSite, payloadRepo } from "#lib/payload";
import { AppHeader, AppHeaderTitle } from "#components/AppHeader";
import { AppMain } from "#components/AppMain";

export default createRoute(async (c) => {
  const [posts, about, site] = await Promise.all([
    payloadRepo.getPosts(5),
    payloadRepo.getAbout(),
    getSite(),
  ]);
  return c.render(
    <>
      <AppHeader coverImage={site.coverUrl}>
        <AppHeaderTitle>{site.title}</AppHeaderTitle>
        <p>{site.description}</p>
      </AppHeader>
      <AppMain>
        {about?.content && <LexicalContent state={about.content} />}
        <section aria-labelledby="recent-entries">
          <h2
            id="recent-entries"
            class="my-[1em] text-[2rem] font-normal text-strong"
          >
            最近の投稿
          </h2>
          <Articles posts={posts} />
        </section>
        <hr class="invisible" />
        <p>
          <a class="button" href="/blog">
            全ての投稿
          </a>
        </p>
      </AppMain>
    </>,
  );
});
