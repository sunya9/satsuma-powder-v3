import { createRoute } from "#lib/app-env";
import { Articles } from "../components/Articles";
import { LexicalContent } from "../lib/lexical";
import { AppHeader, AppHeaderTitle } from "#components/AppHeader";
import { AppMain } from "#components/AppMain";
import { LinkButton } from "#components/LinkButton";

export default createRoute(async (c) => {
  const [posts, about, site] = await Promise.all([
    c.var.payload.getPosts(5),
    c.var.payload.getAbout(),
    c.var.payload.getSite(),
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
