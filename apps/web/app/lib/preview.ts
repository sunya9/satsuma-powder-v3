// Constant-time-ish comparison so a wrong secret can't be timed byte by byte.
// The lengths leak, but the shared secret is fixed-length, so that's harmless.
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// Gate for the runtime preview route. Fails closed when the server has no
// PREVIEW_SECRET configured, so previews are never world-readable by accident.
export function previewSecretMatches(
  provided: string | null | undefined,
  expected: string | undefined,
): boolean {
  if (!expected || !provided) return false;
  return timingSafeEqual(provided, expected);
}
