import {
  createPayloadClient,
  PAYLOAD_URL,
  type Post,
  type PostSummary,
  type Site,
} from "#lib/payload-client";

export { mediaUrl } from "#lib/payload-client";
export type { About, LexicalState, Media, Post, PostSummary, Site } from "#lib/payload-client";

// Build-time only: this module is reached from the SSG routes alone, never from
// the Worker bundle, so it may read Node's process. The key stays out of every
// client bundle because it is not VITE_-prefixed.
const client = createPayloadClient({
  payloadUrl: PAYLOAD_URL,
  apiKey: process.env.PAYLOAD_API_KEY,
});

// Only published posts on the public site (an authenticated request can otherwise see drafts).
const PUBLISHED = { "where[_status][equals]": "published" } as const;

// Memoized once per build/process: site metadata lives in the cms SiteSettings global.
let sitePromise: Promise<Site> | undefined;
export function getSite(): Promise<Site> {
  sitePromise ??= client.site();
  return sitePromise;
}

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

export const payloadRepo = {
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
