/**
 * Lexical JSON を HTML 文字列へ直列化する（RSS の content:encoded 用）。
 * 画面描画は lexical.tsx（hono/jsx）、こちらは文字列が要る箇所専用。
 */
import { mediaUrl, type LexicalState, type Media } from './payload'

type Node = Record<string, any>

const IS_BOLD = 1
const IS_ITALIC = 2
const IS_STRIKETHROUGH = 4
const IS_UNDERLINE = 8
const IS_CODE = 16

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function text(node: Node): string {
  const fmt: number = node.format ?? 0
  let out = escapeHtml(String(node.text ?? ''))
  if (fmt & IS_CODE) out = `<code>${out}</code>`
  if (fmt & IS_BOLD) out = `<strong>${out}</strong>`
  if (fmt & IS_ITALIC) out = `<em>${out}</em>`
  if (fmt & IS_UNDERLINE) out = `<u>${out}</u>`
  if (fmt & IS_STRIKETHROUGH) out = `<s>${out}</s>`
  return out
}

function children(nodes?: Node[]): string {
  return (nodes ?? []).map(node).join('')
}

function node(n: Node): string {
  switch (n.type) {
    case 'text':
      return text(n)
    case 'linebreak':
      return '<br>'
    case 'paragraph': {
      const inner = children(n.children)
      return inner ? `<p>${inner}</p>` : ''
    }
    case 'heading': {
      const tag = /^h[1-6]$/.test(n.tag) ? n.tag : 'h2'
      return `<${tag}>${children(n.children)}</${tag}>`
    }
    case 'quote':
      return `<blockquote>${children(n.children)}</blockquote>`
    case 'list': {
      const tag = n.tag === 'ol' ? 'ol' : 'ul'
      return `<${tag}>${children(n.children)}</${tag}>`
    }
    case 'listitem':
      return `<li>${children(n.children)}</li>`
    case 'link':
    case 'autolink': {
      const raw = String(n.fields?.url ?? '#').trim()
      const url = /^(https?:|mailto:|tel:|\/|#)/i.test(raw) ? raw : '#'
      return `<a href="${escapeHtml(url)}">${children(n.children)}</a>`
    }
    case 'upload': {
      const src = mediaUrl(n.value as Media)
      if (!src) return ''
      const alt = escapeHtml((n.value as Media)?.alt ?? '')
      return `<img src="${escapeHtml(src)}" alt="${alt}" loading="lazy">`
    }
    case 'horizontalrule':
      return '<hr>'
    default:
      return n.children ? children(n.children) : ''
  }
}

export function lexicalToHtml(state?: LexicalState | null): string {
  if (!state?.root?.children) return ''
  return children(state.root.children as Node[])
}
