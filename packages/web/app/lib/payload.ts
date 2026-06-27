const PAYLOAD_URL = (import.meta.env.VITE_PAYLOAD_URL ?? 'http://localhost:3000').replace(/\/$/, '')

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

// Payload returns relative media URLs; make them absolute.
export function mediaUrl(media?: Media | null): string | undefined {
  if (!media?.url) return undefined
  return media.url.startsWith('http') ? media.url : `${PAYLOAD_URL}${media.url}`
}

export interface About {
  content?: LexicalState | null
}

export const payloadRepo = {
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

  async getRecentFull(limit = 15): Promise<Post[]> {
    const res = await api<ListResponse<Post>>('posts', { depth: 2, limit, sort: '-publishedAt' })
    return res.docs
  },

  async getPost(slug: string): Promise<Post | undefined> {
    const res = await api<ListResponse<Post>>('posts', {
      depth: 2,
      limit: 1,
      'where[slug][equals]': slug,
    })
    return res.docs[0]
  },

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
