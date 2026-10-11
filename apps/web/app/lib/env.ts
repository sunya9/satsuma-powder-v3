export interface SiteEnv {
  payloadUrl: string;
  siteUrl: string;
}

const trimSlash = (url: string) => url.replace(/\/$/, "");

export function readEnv(source: Record<string, string | undefined>): SiteEnv {
  return {
    payloadUrl: trimSlash(source.PAYLOAD_URL ?? "http://localhost:3000"),
    siteUrl: trimSlash(source.SITE_URL ?? "http://localhost:5173"),
  };
}
