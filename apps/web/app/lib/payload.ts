const PAYLOAD_URL = (import.meta.env.VITE_PAYLOAD_URL ?? 'http://localhost:3000').replace(/\/$/, '')

// Build-time-only secret (never VITE_-prefixed, so it stays out of any client bundle).
const API_KEY = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process
  ?.env?.PAYLOAD_API_KEY
const authHeaders: HeadersInit = API_KEY ? { Authorization: `users API-Key ${API_KEY}` } : {}

// Only published posts on the public site (an authenticated request can otherwise see drafts).
const PUBLISHED = { 'where[_status][equals]': 'published' } as const

// Public R2 base URL. When set, images are served directly from R2 (no cms at runtime).
const R2_PUBLIC = (import.meta.env.VITE_R2_PUBLIC_URL ?? '').replace(/\/$/, '')

export interface LexicalState {
  root: { children: unknown[]; [k: string]: unknown }
}

export interface Media {
  url?: string | null
  filename?: string | null
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
  const res = await fetch(url.toString(), { headers: authHeaders })
  if (!res.ok) throw new Error(`Payload API ${res.status}: ${url.pathname}${url.search}`)
  return res.json() as Promise<T>
}

export function mediaUrl(media?: Media | null): string | undefined {
  // Serve directly from R2 when configured, so the runtime never touches the cms.
  if (R2_PUBLIC && media?.filename) return `${R2_PUBLIC}/${media.filename}`
  if (!media?.url) return undefined
  return media.url.startsWith('http') ? media.url : `${PAYLOAD_URL}${media.url}`
}

export interface About {
  content?: LexicalState | null
}

export interface Site {
  title: string
  description: string
  twitterHandle: string
  iconUrl?: string
  coverUrl?: string
}

// Memoized once per build/process: site metadata lives in the cms SiteSettings global.
let sitePromise: Promise<Site> | undefined
export function getSite(): Promise<Site> {
  sitePromise ??= (async () => {
    const url = new URL(`${PAYLOAD_URL}/api/globals/site-settings`)
    url.searchParams.set('depth', '1')
    const res = await fetch(url.toString(), { headers: authHeaders })
    if (!res.ok) throw new Error(`SiteSettings ${res.status} (check PAYLOAD_API_KEY)`)
    const d = (await res.json()) as {
      title?: string
      description?: string
      twitterHandle?: string
      icon?: Media | null
      coverImage?: Media | null
    }
    return {
      title: d.title ?? '',
      description: d.description ?? '',
      twitterHandle: d.twitterHandle ?? '',
      iconUrl: mediaUrl(d.icon),
      coverUrl: mediaUrl(d.coverImage),
    }
  })()
  return sitePromise
}

let allPostsPromise: Promise<PostSummary[]> | undefined

export const payloadRepo = {
  async getAbout(): Promise<About | undefined> {
    try {
      const url = new URL(`${PAYLOAD_URL}/api/globals/about`)
      url.searchParams.set('depth', '2')
      const res = await fetch(url.toString(), { headers: authHeaders })
      if (!res.ok) return undefined
      return (await res.json()) as About
    } catch {
      return undefined
    }
  },

  // Memoized once per build: the full published list is requested by several routes.
  async getPosts(size = Infinity): Promise<PostSummary[]> {
    allPostsPromise ??= (async () => {
      const out: PostSummary[] = []
      let page = 1
      while (true) {
        const res = await api<ListResponse<PostSummary>>('posts', {
          depth: 0,
          limit: 100,
          page,
          sort: '-publishedAt',
          ...PUBLISHED,
        })
        out.push(...res.docs)
        if (!res.hasNextPage) break
        page = res.nextPage ?? page + 1
      }
      return out
    })()
    const all = await allPostsPromise
    return Number.isFinite(size) ? all.slice(0, size) : all
  },

  async getRecentFull(limit = 15): Promise<Post[]> {
    const res = await api<ListResponse<Post>>('posts', {
      depth: 2,
      limit,
      sort: '-publishedAt',
      ...PUBLISHED,
    })
    return res.docs
  },

  async getPost(slug: string): Promise<Post | undefined> {
    const res = await api<ListResponse<Post>>('posts', {
      depth: 2,
      limit: 1,
      'where[slug][equals]': slug,
      ...PUBLISHED,
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
      ...PUBLISHED,
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
      ...PUBLISHED,
    })
    return res.docs[0]
  },
}
