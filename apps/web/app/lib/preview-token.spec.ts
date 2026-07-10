import { describe, expect, it } from "vitest";
import { signPreviewToken, verifyPreviewToken } from "#lib/preview-token";

const SECRET = "s3cret";

describe("signPreviewToken", () => {
  // Fixed vector shared with the CMS signer (apps/cms) — both must agree on the
  // HMAC message format `${slug}:${exp}` and `${exp}.${hex}` token layout.
  it("matches the shared HMAC-SHA256 vector", async () => {
    expect(
      await signPreviewToken({ slug: "hello", exp: 1_000_000, secret: SECRET }),
    ).toBe(
      "1000000.05f4910a35bb26951b80c67e72aa12eb9f65c3db27b7bae269d49335556b7070",
    );
  });
});

describe("verifyPreviewToken", () => {
  it("accepts a fresh token for the matching slug", async () => {
    const exp = 2_000;
    const token = await signPreviewToken({ slug: "post-a", exp, secret: SECRET });
    expect(
      await verifyPreviewToken({ token, slug: "post-a", secret: SECRET, now: 1_500 }),
    ).toBe(true);
  });

  it("rejects an expired token", async () => {
    const exp = 1_000;
    const token = await signPreviewToken({ slug: "post-a", exp, secret: SECRET });
    expect(
      await verifyPreviewToken({ token, slug: "post-a", secret: SECRET, now: 1_001 }),
    ).toBe(false);
  });

  it("rejects a token minted for a different slug", async () => {
    const token = await signPreviewToken({ slug: "post-a", exp: 2_000, secret: SECRET });
    expect(
      await verifyPreviewToken({ token, slug: "post-b", secret: SECRET, now: 1_500 }),
    ).toBe(false);
  });

  it("rejects a tampered signature", async () => {
    const token = await signPreviewToken({ slug: "post-a", exp: 2_000, secret: SECRET });
    const tampered = token.slice(0, -1) + (token.endsWith("0") ? "1" : "0");
    expect(
      await verifyPreviewToken({ token: tampered, slug: "post-a", secret: SECRET, now: 1_500 }),
    ).toBe(false);
  });

  it("rejects when the secret is wrong", async () => {
    const token = await signPreviewToken({ slug: "post-a", exp: 2_000, secret: SECRET });
    expect(
      await verifyPreviewToken({ token, slug: "post-a", secret: "other", now: 1_500 }),
    ).toBe(false);
  });

  // Fail closed.
  it("rejects missing token or secret", async () => {
    expect(await verifyPreviewToken({ token: "", slug: "a", secret: SECRET, now: 0 })).toBe(false);
    expect(
      await verifyPreviewToken({ token: "1.abc", slug: "a", secret: undefined, now: 0 }),
    ).toBe(false);
  });
});
