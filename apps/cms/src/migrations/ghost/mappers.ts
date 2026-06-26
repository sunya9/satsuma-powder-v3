/**
 * Ghost エクスポート (db[0].data) の各レコードを Payload の create データへ変換する純粋関数群。
 *
 * I/O やリレーション解決、HTML→Lexical 変換は run.ts (I/O層) が担当し、
 * ここは「入力レコード → 出力データ」の写像と正規化のみに専念する（単体テスト可能に保つため）。
 */

export interface GhostUser {
  id: string
  name: string
  slug: string
  email?: string | null
  profile_image?: string | null
  bio?: string | null
  website?: string | null
}

export interface GhostTag {
  id: string
  name: string
  slug: string
  description?: string | null
  feature_image?: string | null
}

export interface GhostPost {
  id: string
  title: string
  slug: string
  /** 'published' | 'draft' | ... */
  status: string
  /** 'post' | 'page'。未指定は post 扱い。 */
  type?: string
  visibility?: string
  custom_excerpt?: string | null
  feature_image?: string | null
  published_at?: string | null
  html?: string | null
}

/** posts_authors / posts_tags の中間テーブル行。 */
export interface GhostRelation {
  post_id: string
  sort_order?: number
  // author_id / tag_id などの対象 ID キーは buildRelationIndex の引数で指定する
  [key: string]: unknown
}

/** null / 空白のみの文字列を undefined に正規化する（Payload に空文字を送らない）。 */
const clean = (value?: string | null): string | undefined => {
  if (value == null) return undefined
  const trimmed = value.trim()
  return trimmed === '' ? undefined : trimmed
}

export interface MappedAuthor {
  name: string
  slug: string
  bio?: string
  profileImage?: string
  email?: string
  website?: string
}

export function mapAuthor(user: GhostUser): MappedAuthor {
  return {
    name: user.name,
    slug: user.slug,
    bio: clean(user.bio),
    profileImage: clean(user.profile_image),
    email: clean(user.email),
    website: clean(user.website),
  }
}

export interface MappedTag {
  name: string
  slug: string
  description?: string
  featureImage?: string
}

export function mapTag(tag: GhostTag): MappedTag {
  return {
    name: tag.name,
    slug: tag.slug,
    description: clean(tag.description),
    featureImage: clean(tag.feature_image),
  }
}

export type Visibility = 'public' | 'members' | 'paid'
const VISIBILITIES = new Set<Visibility>(['public', 'members', 'paid'])

export interface MappedPost {
  title: string
  slug: string
  excerpt?: string
  featureImage?: string
  publishedAt?: string
  visibility: Visibility
  _status: 'published' | 'draft'
}

export function mapPost(post: GhostPost): MappedPost {
  const visibility = post.visibility as Visibility
  return {
    title: post.title,
    slug: post.slug,
    excerpt: clean(post.custom_excerpt),
    featureImage: clean(post.feature_image),
    publishedAt: clean(post.published_at),
    visibility: VISIBILITIES.has(visibility) ? visibility : 'public',
    _status: post.status === 'published' ? 'published' : 'draft',
  }
}

/** 移行対象は type=post のみ（type=page は除外）。未指定は post 扱い。 */
export function isMigratablePost(post: GhostPost): boolean {
  return (post.type ?? 'post') === 'post'
}

/**
 * posts_authors / posts_tags を `post_id -> [target_id...]`（sort_order 昇順）に索引化する。
 * @param relations 中間テーブル行の配列
 * @param targetKey 対象 ID のキー名（'author_id' | 'tag_id'）
 */
export function buildRelationIndex<T extends GhostRelation>(
  relations: T[],
  targetKey: keyof T,
): Map<string, string[]> {
  const byPost = new Map<string, { id: string; sort: number }[]>()
  for (const relation of relations) {
    const targetId = relation[targetKey] as unknown as string
    if (!targetId) continue
    const list = byPost.get(relation.post_id) ?? []
    list.push({ id: targetId, sort: relation.sort_order ?? 0 })
    byPost.set(relation.post_id, list)
  }

  const result = new Map<string, string[]>()
  for (const [postId, list] of byPost) {
    list.sort((a, b) => a.sort - b.sort)
    result.set(
      postId,
      list.map((entry) => entry.id),
    )
  }
  return result
}
