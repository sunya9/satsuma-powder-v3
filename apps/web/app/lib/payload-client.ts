import type { Author, Media, Post as CmsPost, Tag } from "@cms/payload-types";

export const PAYLOAD_URL = (import.meta.env.VITE_PAYLOAD_URL ?? "http://localhost:3000").replace(
  /\/$/,
  "",
);

const R2_PUBLIC = (import.meta.env.VITE_R2_PUBLIC_URL ?? "").replace(/\/$/, "");

// Derived from the generated cms types; slug and relations narrowed for the
// web's published, depth=2 data.
export type { Media };
export type LexicalState = NonNullable<CmsPost["content"]>;
export type PostSummary = Pick<CmsPost, "id" | "title" | "publishedAt"> & {
  slug: string;
};
export type Post = PostSummary &
  Pick<CmsPost, "content" | "excerpt"> & {
    featureImage?: Media | null;
    authors?: Author[] | null;
    tags?: Tag[] | null;
  };

export interface About {
  content?: LexicalState | null;
}

export interface Site {
  title: string;
  description: string;
  twitterHandle: string;
  iconUrl?: string;
  coverUrl?: string;
}

export interface ListResponse<T> {
  docs: T[];
  hasNextPage: boolean;
  nextPage: number | null;
}

export function mediaUrl(media?: Media | null): string | undefined {
  // Serve directly from R2 when configured, so the runtime never touches the cms.
  if (R2_PUBLIC && media?.filename) return `${R2_PUBLIC}/${media.filename}`;
  if (!media?.url) return undefined;
  return media.url.startsWith("http") ? media.url : `${PAYLOAD_URL}${media.url}`;
}

export interface PayloadClientConfig {
  payloadUrl: string;
  apiKey: string | undefined;
  fetchFn?: typeof fetch;
}

export function createPayloadClient({ payloadUrl, apiKey, fetchFn = fetch }: PayloadClientConfig) {
  const base = payloadUrl.replace(/\/$/, "");
  const headers: HeadersInit = apiKey ? { Authorization: `users API-Key ${apiKey}` } : {};

  async function get<T>(path: string, params: Record<string, string | number>): Promise<T> {
    const url = new URL(`${base}${path}`);
    for (const [key, value] of Object.entries(params)) url.searchParams.set(key, String(value));
    const res = await fetchFn(url.toString(), { headers });
    if (!res.ok) {
      const hint = res.status === 401 || res.status === 403 ? " (check PAYLOAD_API_KEY)" : "";
      throw new Error(`Payload API ${res.status}: ${url.pathname}${url.search}${hint}`);
    }
    return res.json() as Promise<T>;
  }

  function posts(params: Record<string, string | number>): Promise<ListResponse<Post>> {
    return get<ListResponse<Post>>("/api/posts", params);
  }

  return {
    posts,

    async draftPost(slug: string): Promise<Post | undefined> {
      const { docs } = await posts({
        "where[slug][equals]": slug,
        draft: "true",
        depth: 2,
        limit: 1,
      });
      return docs[0];
    },

    async site(): Promise<Site> {
      const d = await get<{
        title?: string;
        description?: string;
        twitterHandle?: string;
        icon?: Media | null;
        coverImage?: Media | null;
      }>("/api/globals/site-settings", { depth: 1 });
      return {
        title: d.title ?? "",
        description: d.description ?? "",
        twitterHandle: d.twitterHandle ?? "",
        iconUrl: mediaUrl(d.icon),
        coverUrl: mediaUrl(d.coverImage),
      };
    },

    async about(): Promise<About | undefined> {
      try {
        return await get<About>("/api/globals/about", { depth: 2 });
      } catch {
        return undefined;
      }
    },

    // The signing key lives only in the CMS, so every check is a round trip.
    // Any failure reads as "invalid" so an unreachable CMS never unlocks a draft.
    async verifyPreviewToken({ slug, token }: { slug: string; token: string }): Promise<boolean> {
      const url = new URL(`${base}/api/posts/preview-token/verify`);
      url.searchParams.set("slug", slug);
      url.searchParams.set("token", token);
      try {
        const res = await fetchFn(url.toString(), { headers });
        return res.status === 200;
      } catch {
        return false;
      }
    },
  };
}

export type PayloadClient = ReturnType<typeof createPayloadClient>;
