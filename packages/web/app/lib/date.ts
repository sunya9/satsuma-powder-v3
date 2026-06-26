/**
 * 日付を JST で整形する。Cloudflare Workers でも動くよう Intl のみ使用（依存なし）。
 * withoutYear=false → "y年MM月dd日" / true → "MM月dd日"
 */
export function formatDate(dateString: string, withoutYear = false): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(dateString))
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? ''
  const [y, m, d] = [get('year'), get('month'), get('day')]
  return withoutYear ? `${m}月${d}日` : `${y}年${m}月${d}日`
}

/** JST での年を返す（年別グルーピング用。UTC ずれを避ける）。 */
export function getYearJST(dateString: string): number {
  const y = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tokyo', year: 'numeric' }).format(
    new Date(dateString),
  )
  return Number(y)
}
