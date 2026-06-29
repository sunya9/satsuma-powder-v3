// Render Payload Lexical JSON to hono/jsx (no dangerouslySetInnerHTML).
import { Hr } from "#components/Hr";
import {
  IS_BOLD,
  IS_CODE,
  IS_ITALIC,
  IS_STRIKETHROUGH,
  IS_UNDERLINE,
  safeUrl,
} from "./lexical-shared";
import { mediaUrl, type LexicalState, type Media } from "./payload";

type Node = Record<string, any>;

function renderText(node: Node) {
  const fmt: number = node.format ?? 0;
  let content: unknown = node.text;
  if (fmt & IS_CODE)
    content = (
      <code class="rounded bg-cream px-1.5 py-0.5 text-xs">{content}</code>
    );
  if (fmt & IS_BOLD) content = <strong>{content}</strong>;
  if (fmt & IS_ITALIC) content = <em>{content}</em>;
  if (fmt & IS_UNDERLINE) content = <u>{content}</u>;
  if (fmt & IS_STRIKETHROUGH) content = <s>{content}</s>;
  return content;
}

const HEADING_SIZE: Record<string, string> = {
  h1: "text-4xl",
  h2: "text-3xl",
  h3: "text-2xl",
  h4: "text-xl",
  h5: "text-lg",
  h6: "text-base",
};

function renderChildren(children: Node[]) {
  return (children ?? []).map((child) => renderNode(child));
}

// Instagram embeds survive the migration as a quote wrapping a link to the post
// (Lexical strips the original <script>). Detect it so we can reproduce the
// official embed: a blockquote.instagram-media that embed.js upgrades.
function instagramEmbedUrl(node: Node): string | undefined {
  let url: string | undefined;
  const visit = (n: Node) => {
    if (url || !n) return;
    const raw = n.type === "link" ? n.fields?.url : undefined;
    const m =
      typeof raw === "string"
        ? raw.match(
            /^https?:\/\/(?:www\.)?instagram\.com\/(?:p|reel|tv)\/[^/?#]+/i,
          )
        : null;
    if (m) url = `${m[0]}/`;
    for (const c of n.children ?? []) visit(c);
  };
  visit(node);
  return url;
}

function renderNode(node: Node): unknown {
  switch (node.type) {
    case "text":
      return renderText(node);

    case "linebreak":
      return <br />;

    case "paragraph": {
      const kids = renderChildren(node.children);
      if (kids.length === 0) return null;
      return <p class="my-4 [text-autospace:normal]">{kids}</p>;
    }

    case "heading": {
      const tag = HEADING_SIZE[node.tag] ? node.tag : "h2";
      const Tag = tag as "h2";
      return (
        <Tag class={`${HEADING_SIZE[tag]} my-4 text-strong text-balance`}>
          {renderChildren(node.children)}
        </Tag>
      );
    }

    case "quote": {
      const ig = instagramEmbedUrl(node);
      if (ig) {
        // Official Instagram embed; embed.js replaces the blockquote with the post.
        return (
          <>
            <blockquote
              class="instagram-media"
              data-instgrm-permalink={ig}
              data-instgrm-version="14"
              style="max-width:540px;min-width:326px;width:100%;margin:1.5rem auto;"
            >
              <a href={ig}>この投稿をInstagramで見る</a>
            </blockquote>
            <script async src="//www.instagram.com/embed.js"></script>
          </>
        );
      }
      return (
        <blockquote class="my-5 border-l-4 border-line/40 pl-4 text-muted">
          {renderChildren(node.children)}
        </blockquote>
      );
    }

    case "list": {
      const ordered = node.tag === "ol";
      const Tag = (ordered ? "ol" : "ul") as "ul";
      return (
        <Tag class={`my-5 pl-6 ${ordered ? "list-decimal" : "list-disc"}`}>
          {renderChildren(node.children)}
        </Tag>
      );
    }

    case "listitem":
      return <li class="my-1">{renderChildren(node.children)}</li>;

    case "link":
    case "autolink": {
      const url = safeUrl(node.fields?.url);
      const newTab = Boolean(node.fields?.newTab);
      return (
        <a
          href={url}
          class="text-link"
          {...(newTab ? { target: "_blank", rel: "noopener noreferrer" } : {})}
        >
          {renderChildren(node.children)}
        </a>
      );
    }

    case "upload": {
      const media = node.value as Media;
      const src = mediaUrl(media);
      if (!src) return null;
      return (
        <img
          src={src}
          alt={media?.alt ?? ""}
          loading="lazy"
          class="mx-auto my-6 block h-auto max-h-[max(333px,33svh)]"
          width={media.width || undefined}
          height={media.height || undefined}
        />
      );
    }

    case "horizontalrule":
      return <Hr />;

    default:
      return node.children ? <>{renderChildren(node.children)}</> : null;
  }
}

export function LexicalContent({
  state,
  class: className,
}: {
  state?: LexicalState | null;
  class?: string;
}) {
  if (!state?.root?.children) return null;
  return <div class={className}>{renderChildren(state.root.children)}</div>;
}
