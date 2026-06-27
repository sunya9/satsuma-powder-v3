// Shared by the hono/jsx renderer (lexical.tsx) and the RSS string serializer (lexical-html.ts).

export const IS_BOLD = 1
export const IS_ITALIC = 2
export const IS_STRIKETHROUGH = 4
export const IS_UNDERLINE = 8
export const IS_CODE = 16

// Allow safe schemes only (block javascript: etc).
export function safeUrl(raw: unknown): string {
  const url = String(raw ?? '#').trim()
  return /^(https?:|mailto:|tel:|\/|#)/i.test(url) ? url : '#'
}
