import { createRoute } from "honox/factory";
import { Articles } from "../components/Articles";
import { LexicalContent } from "../lib/lexical";
import { getSite, payloadRepo } from "../lib/payload";
import { AppHeader, AppHeaderTitle } from "#components/AppHeader";
import { AppMain } from "#components/AppMain";
import { LinkButton } from "#components/LinkButton";

export default createRoute(async (c) => {
  const [posts, about, site] = await Promise.all([
    payloadRepo.getPosts(5),
    payloadRepo.getAbout(),
    getSite(),
  ]);
  return c.render(
    <>
      <AppHeader>
        <AppHeaderTitle>{site.title}</AppHeaderTitle>
        <p>{site.description}</p>
      </AppHeader>
      <AppMain>
        {about?.content && <LexicalContent state={about.content} />}
        <div class="mt-8">
          <section aria-labelledby="recent-entries" class="space-y-4">
            <h2 id="recent-entries" class="text-3xl">
              最近の投稿
            </h2>
            <Articles posts={posts} />
          </section>
          <LinkButton class="mt-8" href="/blog">
            全ての投稿
          </LinkButton>
        </div>
      </AppMain>
    </>,
  );
});
