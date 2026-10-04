import { describe, expect, it, vi } from "vitest";
import { createPreviewClient } from "#lib/preview-client";

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

describe("createPreviewClient.getDraftPost", () => {
  it("queries the latest draft by slug with API-Key auth", async () => {
    const fetchFn = vi.fn(async () => jsonResponse({ docs: [{ id: 1 }] }));
    const client = createPreviewClient({ ...CONFIG, fetchFn });

    await client.getDraftPost("hello-world");

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
    const client = createPreviewClient({ ...CONFIG, fetchFn });

    await expect(client.getDraftPost("draft-post")).resolves.toEqual(post);
  });

  it("returns undefined when no document matches", async () => {
    const fetchFn = vi.fn(async () => jsonResponse({ docs: [] }));
    const client = createPreviewClient({ ...CONFIG, fetchFn });

    await expect(client.getDraftPost("missing")).resolves.toBeUndefined();
  });

  it("throws when the CMS responds with an error status", async () => {
    const fetchFn = vi.fn(async () => jsonResponse({}, { status: 401 }));
    const client = createPreviewClient({ ...CONFIG, fetchFn });

    await expect(client.getDraftPost("any")).rejects.toThrow(/401/);
  });
});

describe("createPreviewClient.getSite", () => {
  it("reads site-settings with API-Key auth", async () => {
    const fetchFn = vi.fn(async () => jsonResponse({ title: "サイト", description: "desc" }));
    const client = createPreviewClient({ ...CONFIG, fetchFn });

    const site = await client.getSite();

    const [input, init] = fetchFn.mock.calls[0] as unknown as FetchArgs;
    expect(input).toContain("/api/globals/site-settings");
    expect(new Headers(init.headers).get("authorization")).toBe("users API-Key key-123");
    expect(site.title).toBe("サイト");
  });
});

describe("createPreviewClient.verifyPreviewToken", () => {
  it("asks the CMS verify endpoint with slug, token and API-Key auth", async () => {
    const fetchFn = vi.fn(async () => jsonResponse({ ok: true }));
    const client = createPreviewClient({ ...CONFIG, fetchFn });

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
    const client = createPreviewClient({
      ...CONFIG,
      fetchFn: vi.fn(async () => jsonResponse({ ok: true })),
    });
    await expect(client.verifyPreviewToken({ slug: "a", token: "t" })).resolves.toBe(true);
  });

  it.each([401, 404, 500])("returns false for a %i response", async (status) => {
    const client = createPreviewClient({
      ...CONFIG,
      fetchFn: vi.fn(async () => jsonResponse({ ok: false }, { status })),
    });
    await expect(client.verifyPreviewToken({ slug: "a", token: "t" })).resolves.toBe(false);
  });

  // Fail closed: an unreachable CMS must not unlock a draft.
  it("returns false when the request fails", async () => {
    const client = createPreviewClient({
      ...CONFIG,
      fetchFn: vi.fn(async () => {
        throw new TypeError("network down");
      }),
    });
    await expect(client.verifyPreviewToken({ slug: "a", token: "t" })).resolves.toBe(false);
  });
});
