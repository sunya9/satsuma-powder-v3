/**
 * Payload CMS (apps/cms) の REST API クライアント。
 * 旧 v2 の `ghostRepo` インターフェースを踏襲し、画面側をほぼ無改修で移植できるようにする。
 *
 * ベースURLは VITE_PAYLOAD_URL（未設定ならローカル cms の http://localhost:3000）。
 */
const PAYLOAD_URL = (import.meta.env.VITE_PAYLOAD_URL ?? 'http://localhost:3000').replace(/\/$/, '')

/** Lexical の SerializedEditorState（中身は lexical.tsx で解釈）。 */
export interface LexicalState {
  root: { children: unknown[]; [k: string]: unknown }
}

export interface Media {
  url?: string | null
  alt?: string | null
  width?: number | null
  height?: number | null
}

export interface PostSummary {
  id: string | number
  title: string
  slug: string
  publishedAt?: string | null
}

export interface Post extends PostSummary {
  content?: LexicalState | null
  excerpt?: string | null
  featureImage?: Media | null
  authors?: { name?: string | null }[] | null
  tags?: { name?: string | null; slug?: string | null }[] | null
}

interface ListResponse<T> {
  docs: T[]
  hasNextPage: boolean
  nextPage: number | null
}

async function api<T>(collection: string, params: Record<string, string | number>): Promise<T> {
  const url = new URL(`${PAYLOAD_URL}/api/${collection}`)
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, String(value))
  const res = await fetch(url.toString())
  if (!res.ok) throw new Error(`Payload API ${res.status}: ${url.pathname}${url.search}`)
  return res.json() as Promise<T>
}

/** media の url を絶対URL化する（Payload は /api/media/file/... の相対を返す）。 */
export function mediaUrl(media?: Media | null): string | undefined {
  if (!media?.url) return undefined
  return media.url.startsWith('http') ? media.url : `${PAYLOAD_URL}${media.url}`
}

export interface About {
  content?: LexicalState | null
}

export const payloadRepo = {
  /** about Global（サイト紹介文）。 */
  async getAbout(): Promise<About | undefined> {
    try {
      const url = new URL(`${PAYLOAD_URL}/api/globals/about`)
      url.searchParams.set('depth', '2')
      const res = await fetch(url.toString())
      if (!res.ok) return undefined
      return (await res.json()) as About
    } catch {
      return undefined
    }
  },

  /** 公開記事を publishedAt 降順で取得（size 指定で件数制限、既定は全件）。 */
  async getPosts(size = Infinity): Promise<PostSummary[]> {
    const out: PostSummary[] = []
    let page = 1
    while (out.length < size) {
      const limit = Math.min(size - out.length, 100)
      const res = await api<ListResponse<PostSummary>>('posts', {
        depth: 0,
        limit,
        page,
        sort: '-publishedAt',
      })
      out.push(...res.docs)
      if (!res.hasNextPage) break
      page = res.nextPage ?? page + 1
    }
    return out
  },

  /** 最新 N 件を本文・画像・著者・タグ込みで取得（RSS 用）。 */
  async getRecentFull(limit = 15): Promise<Post[]> {
    const res = await api<ListResponse<Post>>('posts', { depth: 2, limit, sort: '-publishedAt' })
    return res.docs
  },

  /** slug で記事1件を取得（本文・画像・著者・タグを populate するため depth=2）。 */
  async getPost(slug: string): Promise<Post | undefined> {
    const res = await api<ListResponse<Post>>('posts', {
      depth: 2,
      limit: 1,
      'where[slug][equals]': slug,
    })
    return res.docs[0]
  },

  /** 直前（より古い）記事。 */
  async getOlderPost(publishedAt?: string | null): Promise<PostSummary | undefined> {
    if (!publishedAt) return undefined
    const res = await api<ListResponse<PostSummary>>('posts', {
      depth: 0,
      limit: 1,
      sort: '-publishedAt',
      'where[publishedAt][less_than]': publishedAt,
    })
    return res.docs[0]
  },

  /** 直後（より新しい）記事。 */
  async getNewerPost(publishedAt?: string | null): Promise<PostSummary | undefined> {
    if (!publishedAt) return undefined
    const res = await api<ListResponse<PostSummary>>('posts', {
      depth: 0,
      limit: 1,
      sort: 'publishedAt',
      'where[publishedAt][greater_than]': publishedAt,
    })
    return res.docs[0]
  },
}
