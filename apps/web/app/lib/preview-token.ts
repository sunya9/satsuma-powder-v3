// Short-lived, slug-bound preview token. The CMS signs one per preview click
// (see apps/cms buildPreviewPath); the web preview endpoint verifies it. Unlike
// the shared secret, a leaked token expires in seconds and can't be reused for
// another draft, so it's safe to carry in the URL. Format: `${exp}.${hexHmac}`
// where the HMAC-SHA256 message is `${slug}:${exp}` (exp = ms epoch).
const encoder = new TextEncoder();

function toHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
}

async function hmacHex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  return toHex(sig);
}

// Constant-time compare of two equal-length hex strings.
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function signPreviewToken({
  slug,
  exp,
  secret,
}: {
  slug: string;
  exp: number;
  secret: string;
}): Promise<string> {
  return `${exp}.${await hmacHex(secret, `${slug}:${exp}`)}`;
}

export async function verifyPreviewToken({
  token,
  slug,
  secret,
  now,
}: {
  token: string | null | undefined;
  slug: string;
  secret: string | undefined;
  now: number;
}): Promise<boolean> {
  if (!secret || !token) return false;
  const dot = token.indexOf(".");
  if (dot < 0) return false;
  const exp = Number(token.slice(0, dot));
  if (!Number.isFinite(exp) || now > exp) return false;
  const expected = await hmacHex(secret, `${slug}:${exp}`);
  return timingSafeEqual(token.slice(dot + 1), expected);
}
