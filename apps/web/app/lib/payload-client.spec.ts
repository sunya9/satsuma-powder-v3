import { describe, expect, it, vi } from "vitest";
import { createPayloadClient } from "#lib/payload-client";

const CONFIG = {
  payloadUrl: "https://cms.example.com",
  apiKey: "key-123",
};

function jsonResponse(body: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
    ...init,
  });
}

// The zero-arg mock impls give mock.calls an empty-tuple type; assert the shape
// the client actually calls fetch with.
type FetchArgs = [string, RequestInit];

describe("createPayloadClient.draftPost", () => {
  it("queries the latest draft by slug with API-Key auth", async () => {
    const fetchFn = vi.fn(async () => jsonResponse({ docs: [{ id: 1 }] }));
    const client = createPayloadClient({ ...CONFIG, fetchFn });

    await client.draftPost("hello-world");

    expect(fetchFn).toHaveBeenCalledTimes(1);
    const [input, init] = fetchFn.mock.calls[0] as unknown as FetchArgs;
    const url = new URL(input);
    expect(url.origin + url.pathname).toBe("https://cms.example.com/api/posts");
    expect(url.searchParams.get("where[slug][equals]")).toBe("hello-world");
    expect(url.searchParams.get("draft")).toBe("true");
    expect(url.searchParams.get("depth")).toBe("2");
    expect(url.searchParams.get("limit")).toBe("1");
    expect(new Headers(init.headers).get("authorization")).toBe("users API-Key key-123");
  });

  it("returns the first matching draft document", async () => {
    const post = { id: 7, slug: "draft-post", title: "下書き" };
    const fetchFn = vi.fn(async () => jsonResponse({ docs: [post] }));
    const client = createPayloadClient({ ...CONFIG, fetchFn });

    await expect(client.draftPost("draft-post")).resolves.toEqual(post);
  });

  it("returns undefined when no document matches", async () => {
    const fetchFn = vi.fn(async () => jsonResponse({ docs: [] }));
    const client = createPayloadClient({ ...CONFIG, fetchFn });

    await expect(client.draftPost("missing")).resolves.toBeUndefined();
  });

  it("throws when the CMS responds with an error status", async () => {
    const fetchFn = vi.fn(async () => jsonResponse({}, { status: 401 }));
    const client = createPayloadClient({ ...CONFIG, fetchFn });

    await expect(client.draftPost("any")).rejects.toThrow(/401/);
  });
});

describe("createPayloadClient.posts", () => {
  it("sets every given param on the query string with API-Key auth", async () => {
    const fetchFn = vi.fn(async () =>
      jsonResponse({ docs: [], hasNextPage: false, nextPage: null }),
    );
    const client = createPayloadClient({ ...CONFIG, fetchFn });

    await client.posts({
      depth: 2,
      limit: 100,
      page: 3,
      sort: "-publishedAt",
      "where[_status][equals]": "published",
    });

    const [input, init] = fetchFn.mock.calls[0] as unknown as FetchArgs;
    const url = new URL(input);
    expect(url.origin + url.pathname).toBe("https://cms.example.com/api/posts");
    expect(url.searchParams.get("depth")).toBe("2");
    expect(url.searchParams.get("limit")).toBe("100");
    expect(url.searchParams.get("page")).toBe("3");
    expect(url.searchParams.get("sort")).toBe("-publishedAt");
    expect(url.searchParams.get("where[_status][equals]")).toBe("published");
    expect(new Headers(init.headers).get("authorization")).toBe("users API-Key key-123");
  });
});

describe("createPayloadClient without an API key", () => {
  it("sends no Authorization header", async () => {
    const fetchFn = vi.fn(async () =>
      jsonResponse({ docs: [], hasNextPage: false, nextPage: null }),
    );
    const client = createPayloadClient({ ...CONFIG, apiKey: undefined, fetchFn });

    await client.posts({ depth: 2 });

    const [, init] = fetchFn.mock.calls[0] as unknown as FetchArgs;
    expect(new Headers(init.headers).has("authorization")).toBe(false);
  });
});

describe("createPayloadClient.site", () => {
  it("reads site-settings with API-Key auth", async () => {
    const fetchFn = vi.fn(async () => jsonResponse({ title: "サイト", description: "desc" }));
    const client = createPayloadClient({ ...CONFIG, fetchFn });

    const site = await client.site();

    const [input, init] = fetchFn.mock.calls[0] as unknown as FetchArgs;
    expect(input).toContain("/api/globals/site-settings");
    expect(new Headers(init.headers).get("authorization")).toBe("users API-Key key-123");
    expect(site.title).toBe("サイト");
  });
});

describe("createPayloadClient.verifyPreviewToken", () => {
  it("asks the CMS verify endpoint with slug, token and API-Key auth", async () => {
    const fetchFn = vi.fn(async () => jsonResponse({ ok: true }));
    const client = createPayloadClient({ ...CONFIG, fetchFn });

    await client.verifyPreviewToken({ slug: "日本語", token: "123.abc" });

    expect(fetchFn).toHaveBeenCalledTimes(1);
    const [input, init] = fetchFn.mock.calls[0] as unknown as FetchArgs;
    const url = new URL(input);
    expect(url.origin + url.pathname).toBe(
      "https://cms.example.com/api/posts/preview-token/verify",
    );
    expect(url.searchParams.get("slug")).toBe("日本語");
    expect(url.searchParams.get("token")).toBe("123.abc");
    expect(new Headers(init.headers).get("authorization")).toBe("users API-Key key-123");
  });

  it("returns true only for a 200 response", async () => {
    const client = createPayloadClient({
      ...CONFIG,
      fetchFn: vi.fn(async () => jsonResponse({ ok: true })),
    });
    await expect(client.verifyPreviewToken({ slug: "a", token: "t" })).resolves.toBe(true);
  });

  it.each([401, 404, 500])("returns false for a %i response", async (status) => {
    const client = createPayloadClient({
      ...CONFIG,
      fetchFn: vi.fn(async () => jsonResponse({ ok: false }, { status })),
    });
    await expect(client.verifyPreviewToken({ slug: "a", token: "t" })).resolves.toBe(false);
  });

  // Fail closed: an unreachable CMS must not unlock a draft.
  it("returns false when the request fails", async () => {
    const client = createPayloadClient({
      ...CONFIG,
      fetchFn: vi.fn(async () => {
        throw new TypeError("network down");
      }),
    });
    await expect(client.verifyPreviewToken({ slug: "a", token: "t" })).resolves.toBe(false);
  });
});
