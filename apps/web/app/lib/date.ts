// Intl only (no deps) so it runs on Cloudflare Workers.
export function formatDate(dateString: string, withoutYear = false): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(dateString));
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const [y, m, d] = [get("year"), get("month"), get("day")];
  return withoutYear ? `${m}月${d}日` : `${y}年${m}月${d}日`;
}

export function getYearJST(dateString: string): number {
  const y = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
  }).format(new Date(dateString));
  return Number(y);
}
