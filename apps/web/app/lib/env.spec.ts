import { describe, expect, it } from "vitest";
import { readEnv } from "#lib/env";

describe("readEnv", () => {
  it("falls back to the local dev servers when unset", () => {
    expect(readEnv({})).toEqual({
      payloadUrl: "http://localhost:3000",
      siteUrl: "http://localhost:5173",
    });
  });

  it("passes configured values through", () => {
    expect(
      readEnv({ PAYLOAD_URL: "https://cms.example.com", SITE_URL: "https://example.com" }),
    ).toEqual({ payloadUrl: "https://cms.example.com", siteUrl: "https://example.com" });
  });

  it("strips one trailing slash", () => {
    expect(
      readEnv({ PAYLOAD_URL: "https://cms.example.com/", SITE_URL: "https://example.com/" }),
    ).toEqual({ payloadUrl: "https://cms.example.com", siteUrl: "https://example.com" });
  });
});
