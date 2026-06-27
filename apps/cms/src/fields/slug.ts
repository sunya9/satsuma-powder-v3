// Payload's default slugify strips non-ASCII (its [^\w-] removes JP/CN letters),
// collapsing a Japanese title to an empty slug. Keep unicode letters/numbers.
export const slugify = ({ valueToSlugify }: { valueToSlugify?: unknown }): string =>
  String(valueToSlugify ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\p{L}\p{N}-]+/gu, '')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '')
