import type { PayloadClient, Post, PostSummary, Site } from "#lib/payload-client";

// Only published posts on the public site (an authenticated request can otherwise see drafts).
const PUBLISHED = { "where[_status][equals]": "published" } as const;

export function createPayloadRepo(client: PayloadClient) {
  // Memoized once per build/process: site metadata lives in the cms SiteSettings global.
  let sitePromise: Promise<Site> | undefined;

  // Fetched once per build: all published posts with relations, ordered by -publishedAt.
  // Every post route reads from this instead of issuing its own query (cuts ~600 requests to ~2).
  let fullPostsPromise: Promise<{ ordered: Post[]; bySlug: Map<string, Post> }> | undefined;
  function allFullPosts() {
    fullPostsPromise ??= (async () => {
      const ordered: Post[] = [];
      let page = 1;
      while (true) {
        const res = await client.posts({
          depth: 2,
          limit: 100,
          page,
          sort: "-publishedAt",
          ...PUBLISHED,
        });
        ordered.push(...res.docs);
        if (!res.hasNextPage) break;
        page = res.nextPage ?? page + 1;
      }
      return { ordered, bySlug: new Map(ordered.map((p) => [p.slug, p])) };
    })();
    return fullPostsPromise;
  }

  return {
    getSite(): Promise<Site> {
      sitePromise ??= client.site();
      return sitePromise;
    },

    getAbout: () => client.about(),

    async getPosts(size = Infinity): Promise<PostSummary[]> {
      const { ordered } = await allFullPosts();
      return Number.isFinite(size) ? ordered.slice(0, size) : ordered;
    },

    async getRecentFull(limit = 15): Promise<Post[]> {
      const { ordered } = await allFullPosts();
      return ordered.slice(0, limit);
    },

    async getPost(slug: string): Promise<Post | undefined> {
      const { bySlug } = await allFullPosts();
      return bySlug.get(slug);
    },

    // Neighbors come from the in-memory ordered list (-publishedAt).
    async getOlderPost(publishedAt?: string | null): Promise<PostSummary | undefined> {
      if (!publishedAt) return undefined;
      const { ordered } = await allFullPosts();
      return ordered.find((p) => (p.publishedAt ?? "") < publishedAt);
    },

    async getNewerPost(publishedAt?: string | null): Promise<PostSummary | undefined> {
      if (!publishedAt) return undefined;
      const { ordered } = await allFullPosts();
      return [...ordered].reverse().find((p) => (p.publishedAt ?? "") > publishedAt);
    },
  };
}

export type PayloadRepo = ReturnType<typeof createPayloadRepo>;
