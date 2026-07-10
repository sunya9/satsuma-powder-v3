import { describe, expect, it } from "vitest";
import { previewSecretMatches } from "#lib/preview";

describe("previewSecretMatches", () => {
  it("accepts a provided secret equal to the expected one", () => {
    expect(previewSecretMatches("s3cr3t", "s3cr3t")).toBe(true);
  });

  it("rejects a mismatching secret", () => {
    expect(previewSecretMatches("wrong", "s3cr3t")).toBe(false);
  });

  it("rejects a secret that only differs in length", () => {
    expect(previewSecretMatches("s3cr3t-extra", "s3cr3t")).toBe(false);
  });

  // Fail closed: an unconfigured server must never accept previews.
  it("rejects when the expected secret is missing or empty", () => {
    expect(previewSecretMatches("anything", undefined)).toBe(false);
    expect(previewSecretMatches("anything", "")).toBe(false);
  });

  it("rejects an empty or absent provided secret", () => {
    expect(previewSecretMatches(null, "s3cr3t")).toBe(false);
    expect(previewSecretMatches("", "s3cr3t")).toBe(false);
  });
});
