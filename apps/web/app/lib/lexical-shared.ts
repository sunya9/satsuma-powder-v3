// Shared by the hono/jsx renderer (lexical.tsx) and the RSS string serializer (lexical-html.ts).

// Loose shape of a Payload Lexical node: only the fields the renderers read.
// A type alias (not an interface) so it stays cast-compatible with the
// generated LexicalState nodes, which are index-signature records.
export type LexicalNode = {
  type?: string;
  format?: number;
  text?: string;
  tag?: string;
  fields?: { url?: string; newTab?: boolean };
  value?: unknown;
  children?: LexicalNode[];
};

export const IS_BOLD = 1;
export const IS_ITALIC = 2;
export const IS_STRIKETHROUGH = 4;
export const IS_UNDERLINE = 8;
export const IS_CODE = 16;

// Allow safe schemes only (block javascript: etc).
export function safeUrl(raw: unknown): string {
  const url = String(raw ?? "#").trim();
  return /^(https?:|mailto:|tel:|\/|#)/i.test(url) ? url : "#";
}
