import { describe, expect, it } from "vitest";
import { previewCookieMaxAge } from "#lib/preview-cookie";

describe("previewCookieMaxAge", () => {
  it("caps the cookie at one hour for long-lived tokens", () => {
    expect(previewCookieMaxAge("86400000.abc", 0)).toBe(3600);
  });

  it("does not outlive the token", () => {
    expect(previewCookieMaxAge("1600500.abc", 1_000_000)).toBe(600);
  });

  it("never goes negative", () => {
    expect(previewCookieMaxAge("1000.abc", 5_000)).toBe(0);
  });

  // The CMS already validated the token; an unparsable prefix just gets the cap.
  it("falls back to one hour when the expiry can't be parsed", () => {
    expect(previewCookieMaxAge("garbage", 0)).toBe(3600);
    expect(previewCookieMaxAge("x.abc", 0)).toBe(3600);
  });
});
