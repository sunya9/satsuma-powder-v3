import type { Media } from "@cms/payload-types";
import { mediaUrl, type Post, type Site } from "#lib/payload";

// Runtime-credentialed CMS client for the preview Worker. Unlike payloadRepo
// (build-time, published-only, memoized), this reads a single draft on demand
// with credentials supplied per request from the Worker's env.
export interface PreviewClientConfig {
  payloadUrl: string;
  apiKey: string;
  fetchFn?: typeof fetch;
}

interface ListResponse<T> {
  docs: T[];
}

export function createPreviewClient({
  payloadUrl,
  apiKey,
  fetchFn = fetch,
}: PreviewClientConfig) {
  const base = payloadUrl.replace(/\/$/, "");
  const headers: HeadersInit = { Authorization: `users API-Key ${apiKey}` };

  async function get<T>(url: URL): Promise<T> {
    const res = await fetchFn(url.toString(), { headers });
    if (!res.ok)
      throw new Error(`Payload API ${res.status}: ${url.pathname}${url.search}`);
    return res.json() as Promise<T>;
  }

  return {
    async getDraftPost(slug: string): Promise<Post | undefined> {
      const url = new URL(`${base}/api/posts`);
      url.searchParams.set("where[slug][equals]", slug);
      // draft=true returns the latest draft version instead of the published one.
      url.searchParams.set("draft", "true");
      url.searchParams.set("depth", "2");
      url.searchParams.set("limit", "1");
      const { docs } = await get<ListResponse<Post>>(url);
      return docs[0];
    },

    async getSite(): Promise<Site> {
      const url = new URL(`${base}/api/globals/site-settings`);
      url.searchParams.set("depth", "1");
      const d = await get<{
        title?: string;
        description?: string;
        twitterHandle?: string;
        icon?: Media | null;
        coverImage?: Media | null;
      }>(url);
      return {
        title: d.title ?? "",
        description: d.description ?? "",
        twitterHandle: d.twitterHandle ?? "",
        iconUrl: mediaUrl(d.icon),
        coverUrl: mediaUrl(d.coverImage),
      };
    },
  };
}
