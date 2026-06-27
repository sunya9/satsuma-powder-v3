// Render Payload Lexical JSON to hono/jsx (no dangerouslySetInnerHTML).
import { IS_BOLD, IS_CODE, IS_ITALIC, IS_STRIKETHROUGH, IS_UNDERLINE, safeUrl } from './lexical-shared'
import { mediaUrl, type LexicalState, type Media } from './payload'

type Node = Record<string, any>

function renderText(node: Node) {
  const fmt: number = node.format ?? 0
  let content: unknown = node.text
  if (fmt & IS_CODE)
    content = <code class="rounded bg-cream px-1.5 py-0.5 text-[0.9em]">{content}</code>
  if (fmt & IS_BOLD) content = <strong>{content}</strong>
  if (fmt & IS_ITALIC) content = <em>{content}</em>
  if (fmt & IS_UNDERLINE) content = <u>{content}</u>
  if (fmt & IS_STRIKETHROUGH) content = <s>{content}</s>
  return content
}

const HEADING_SIZE: Record<string, string> = {
  h1: 'text-[2.666rem]',
  h2: 'text-[2rem]',
  h3: 'text-[1.6rem]',
  h4: 'text-[1.333rem]',
  h5: 'text-[1.143rem]',
  h6: 'text-base',
}

function renderChildren(children?: Node[]) {
  return (children ?? []).map((child) => renderNode(child))
}

function renderNode(node: Node): unknown {
  switch (node.type) {
    case 'text':
      return renderText(node)

    case 'linebreak':
      return <br />

    case 'paragraph': {
      const kids = renderChildren(node.children)
      if (kids.length === 0) return null
      return <p class="my-5 leading-[1.9]">{kids}</p>
    }

    case 'heading': {
      const tag = HEADING_SIZE[node.tag] ? node.tag : 'h2'
      const Tag = tag as 'h2'
      return (
        <Tag class={`${HEADING_SIZE[tag]} my-[1em] font-normal leading-tight text-strong`}>
          {renderChildren(node.children)}
        </Tag>
      )
    }

    case 'quote':
      return (
        <blockquote class="my-5 border-l-2 border-accent/40 pl-4 text-muted">
          {renderChildren(node.children)}
        </blockquote>
      )

    case 'list': {
      const ordered = node.tag === 'ol'
      const Tag = (ordered ? 'ol' : 'ul') as 'ul'
      return (
        <Tag class={`my-5 pl-6 ${ordered ? 'list-decimal' : 'list-disc'}`}>
          {renderChildren(node.children)}
        </Tag>
      )
    }

    case 'listitem':
      return <li class="my-1">{renderChildren(node.children)}</li>

    case 'link':
    case 'autolink': {
      const url = safeUrl(node.fields?.url)
      const newTab = Boolean(node.fields?.newTab)
      return (
        <a
          href={url}
          class="text-accent underline underline-offset-2 hover:text-accent/60"
          {...(newTab ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
        >
          {renderChildren(node.children)}
        </a>
      )
    }

    case 'upload': {
      const media = node.value as Media
      const src = mediaUrl(media)
      if (!src) return null
      return (
        <img
          src={src}
          alt={media?.alt ?? ''}
          loading="lazy"
          class="mx-auto my-6 block h-auto max-h-[max(333px,33svh)]"
        />
      )
    }

    case 'horizontalrule':
      return <hr class="my-8 border-t border-line" />

    default:
      return node.children ? <>{renderChildren(node.children)}</> : null
  }
}

export function LexicalContent({ state }: { state?: LexicalState | null }) {
  if (!state?.root?.children) return null
  return <>{renderChildren(state.root.children as Node[])}</>
}
