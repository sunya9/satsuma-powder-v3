/**
 * Ghost エクスポート JSON → Payload への一度きりの移行スクリプト（Local API 使用）。
 *
 * 使い方:
 *   pnpm migrate:ghost              # 本実行（DB へ投入 + 画像を media へ取り込み）
 *   pnpm migrate:ghost --dry-run    # 件数と変換健全性のみ確認（DB 書き込み・画像DLなし）
 *   GHOST_EXPORT=path/to/export.json pnpm migrate:ghost
 *
 * 設計:
 * - 入力レコード → Payload データへの写像は ./mappers の純粋関数に委譲（単体テスト済み）。
 * - 画像（feature image / 著者画像 / 本文 <img>）はすべて外部URLから **ダウンロードして media コレクションへ取り込む**。
 *   保存先は payload.config の storage アダプタ（本番は S3 / Cloudflare R2、ローカルは media/）。
 *   外部URL依存を排し、ストレージを R2 に一本化するため。
 * - media は `sourceUrl` で重複排除し、entity は slug で findOrUpdate する冪等設計。
 * - 本文 <img> は標準の Lexical upload ノード（media 参照）へ変換する。
 */
import 'dotenv/config'
import { readFileSync } from 'fs'
import path from 'path'
import { randomUUID } from 'crypto'

import { getPayload } from 'payload'
import { convertHTMLToLexical, editorConfigFactory } from '@payloadcms/richtext-lexical'
import { JSDOM } from 'jsdom'

import config from '../../payload.config'
import {
  buildRelationIndex,
  isMigratablePost,
  mapAuthor,
  mapPost,
  mapTag,
  type GhostPost,
  type GhostRelation,
  type GhostTag,
  type GhostUser,
} from './mappers'

const DRY_RUN = process.argv.includes('--dry-run')
const DEFAULT_EXPORT = 'fen-mi-gan.ghost.2026-06-26-17-54-25.json'

type CollectionSlug = 'authors' | 'tags' | 'posts'
type PayloadID = string | number

function loadGhostData() {
  const exportPath = process.env.GHOST_EXPORT
    ? path.resolve(process.env.GHOST_EXPORT)
    : path.resolve(process.cwd(), DEFAULT_EXPORT)
  const raw = JSON.parse(readFileSync(exportPath, 'utf8'))
  const data = raw?.db?.[0]?.data
  if (!data) throw new Error(`Ghost export の構造が不正です: ${exportPath}`)
  return {
    exportPath,
    users: (data.users ?? []) as GhostUser[],
    tags: (data.tags ?? []) as GhostTag[],
    posts: (data.posts ?? []) as GhostPost[],
    postsAuthors: (data.posts_authors ?? []) as GhostRelation[],
    postsTags: (data.posts_tags ?? []) as GhostRelation[],
  }
}

// ───────────────────────── 本文画像（<img>）の抽出 ─────────────────────────
// convertHTMLToLexical に <img> を渡すと media 参照の upload ノードになるが、変換時点では
// media ドキュメントが無いため値が空になり無効化される。そこで変換前に <img> を一意マーカーへ
// 置換して URL/alt を控え、media へ取り込んだ後にマーカーを upload ノードへ復元する。
const MARKER_RE = /@@EXTIMG_(\d+)@@/
const MARKER_SPLIT_RE = /(@@EXTIMG_\d+@@)/

interface ExtractedImage {
  url: string
  alt: string
}

function extractExternalImages(
  html: string,
  JSDOMCtor: typeof JSDOM,
): { html: string; images: ExtractedImage[] } {
  const dom = new JSDOMCtor(html)
  const doc = dom.window.document
  const images: ExtractedImage[] = []
  for (const img of Array.from(doc.querySelectorAll('img'))) {
    const url = img.getAttribute('src')?.trim() ?? ''
    if (!url) {
      img.remove()
      continue
    }
    images.push({ url, alt: img.getAttribute('alt')?.trim() ?? '' })
    img.replaceWith(doc.createTextNode(`@@EXTIMG_${images.length - 1}@@`))
  }
  return { html: doc.body.innerHTML, images }
}

// media 参照の Lexical upload ノードを組み立てる。
function uploadNode(mediaId: PayloadID) {
  return {
    type: 'upload',
    version: 3,
    format: '',
    fields: null,
    id: randomUUID(),
    relationTo: 'media',
    value: mediaId,
  }
}

const emptyParagraph = () => ({
  type: 'paragraph',
  version: 1,
  format: '',
  indent: 0,
  direction: null,
  textFormat: 0,
  textStyle: '',
  children: [] as unknown[],
})

// ルート段落に紛れたマーカーを、解決済み media ID の upload ノードへ展開する。
// インライン画像はマーカー前後でテキスト段落とブロックに分割する。
// media 解決に失敗した（mediaIds[n] が無い）マーカーは破棄する。
function expandImageMarkers(root: { children: any[] }, mediaIds: (PayloadID | undefined)[]): void {
  const out: any[] = []
  for (const node of root.children) {
    const hasMarker =
      node.type === 'paragraph' &&
      Array.isArray(node.children) &&
      node.children.some((c: any) => c.type === 'text' && MARKER_RE.test(c.text ?? ''))
    if (!hasMarker) {
      out.push(node)
      continue
    }

    let pending: any[] = []
    const flush = () => {
      if (pending.length) {
        out.push({ ...emptyParagraph(), children: pending })
        pending = []
      }
    }
    for (const child of node.children) {
      if (child.type === 'text' && MARKER_RE.test(child.text ?? '')) {
        for (const part of child.text.split(MARKER_SPLIT_RE)) {
          const m = /^@@EXTIMG_(\d+)@@$/.exec(part)
          if (m) {
            const mediaId = mediaIds[Number(m[1])]
            if (mediaId != null) {
              flush()
              out.push(uploadNode(mediaId))
            }
          } else if (part !== '') {
            pending.push({ ...child, text: part })
          }
        }
      } else {
        pending.push(child)
      }
    }
    flush()
  }
  root.children = out
}

// ルート直下に昇格できない位置（例: bookmark card のリンク内サムネイル）に残ったマーカーを除去する。
// @returns 除去（スキップ）したマーカー数
function stripLeftoverMarkers(node: any): number {
  let count = 0
  if (node.type === 'text' && typeof node.text === 'string' && MARKER_RE.test(node.text)) {
    count += (node.text.match(/@@EXTIMG_\d+@@/g) ?? []).length
    node.text = node.text.replace(/@@EXTIMG_\d+@@/g, '').trim()
  }
  for (const child of node.children ?? []) count += stripLeftoverMarkers(child)
  return count
}

// ───────────────────────── 画像ダウンロード ─────────────────────────
const MIME_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
  'image/avif': 'avif',
  'image/bmp': 'bmp',
}

function filenameFor(url: string, mimetype: string): string {
  const ext = MIME_EXT[mimetype] ?? 'bin'
  try {
    const decodedPath = decodeURIComponent(new URL(url).pathname)
    const base = (decodedPath.split('/').pop() ?? '')
      .replace(/\.[a-z0-9]+$/i, '')
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .slice(0, 60)
    if (base) return `${base}.${ext}`
  } catch {
    // fall through
  }
  return `${randomUUID()}.${ext}`
}

async function downloadImage(
  url: string,
): Promise<{ buffer: Buffer; mimetype: string; name: string } | null> {
  const res = await fetch(url)
  if (!res.ok) return null
  const mimetype = (res.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase()
  if (!mimetype.startsWith('image/')) return null
  const buffer = Buffer.from(await res.arrayBuffer())
  return { buffer, mimetype, name: filenameFor(url, mimetype) }
}

async function main() {
  const sanitizedConfig = await config
  const editorConfig = await editorConfigFactory.default({ config: sanitizedConfig })

  const { exportPath, users, tags, posts, postsAuthors, postsTags } = loadGhostData()
  const migratablePosts = posts.filter(isMigratablePost)
  const skippedPages = posts.length - migratablePosts.length

  console.log(`📦 Ghost export: ${exportPath}`)
  console.log(
    `   authors=${users.length} tags=${tags.length} posts=${migratablePosts.length} (page等を${skippedPages}件除外)`,
  )

  if (DRY_RUN) {
    const totalImages = migratablePosts.reduce(
      (n, p) => n + (p.html?.match(/<img/gi)?.length ?? 0),
      0,
    )
    const sample =
      migratablePosts.find((p) => /<img/i.test(p.html ?? '')) ?? migratablePosts.find((p) => p.html)
    try {
      const { html: cleaned } = extractExternalImages(sample?.html ?? '', JSDOM)
      const converted = convertHTMLToLexical({ editorConfig, html: cleaned, JSDOM }) as {
        root: { children: any[] }
      }
      console.log(
        `   ✅ html→Lexical 変換サンプル OK: "${sample?.title}" root.children=${converted.root.children.length}`,
      )
    } catch (error) {
      console.error('   ❌ html→Lexical 変換サンプル 失敗:', error)
    }
    console.log(`   本文画像 ≈ ${totalImages} 枚 + feature/著者画像を media へ取り込む想定。`)
    console.log('🚫 --dry-run のため DB への書き込み・画像DLは行いません。')
    return
  }

  const payload = await getPayload({ config: sanitizedConfig })

  const summary = {
    authors: { created: 0, updated: 0, failed: 0 },
    tags: { created: 0, updated: 0, failed: 0 },
    posts: { created: 0, updated: 0, failed: 0 },
    media: { created: 0, reused: 0, failed: 0 },
  }

  // 外部画像URL → media ID。sourceUrl で重複排除し、ダウンロードして media へ取り込む。
  const mediaCache = new Map<string, PayloadID | undefined>()
  const ensureMedia = async (
    sourceUrl?: string,
    alt?: string,
  ): Promise<PayloadID | undefined> => {
    if (!sourceUrl) return undefined
    if (mediaCache.has(sourceUrl)) return mediaCache.get(sourceUrl)

    const existing = await payload.find({
      collection: 'media',
      where: { sourceUrl: { equals: sourceUrl } },
      limit: 1,
      depth: 0,
    })
    if (existing.docs[0]) {
      const id = existing.docs[0].id as PayloadID
      summary.media.reused += 1
      mediaCache.set(sourceUrl, id)
      return id
    }

    try {
      const file = await downloadImage(sourceUrl)
      if (!file) {
        summary.media.failed += 1
        mediaCache.set(sourceUrl, undefined)
        console.warn(`   ⚠️  画像取得失敗（スキップ）: ${sourceUrl.slice(0, 80)}`)
        return undefined
      }
      const doc = await payload.create({
        collection: 'media',
        data: { alt: alt || file.name, sourceUrl },
        file: { data: file.buffer, mimetype: file.mimetype, name: file.name, size: file.buffer.length },
      })
      const id = doc.id as PayloadID
      summary.media.created += 1
      mediaCache.set(sourceUrl, id)
      return id
    } catch (error) {
      summary.media.failed += 1
      mediaCache.set(sourceUrl, undefined)
      console.warn(`   ⚠️  画像取り込み失敗（スキップ）: ${sourceUrl.slice(0, 60)} : ${(error as Error).message}`)
      return undefined
    }
  }

  // Ghost の html を Lexical へ変換し、本文画像を media へ取り込んで upload ノードへ復元する。
  const htmlToLexical = async (html?: string | null, label = '') => {
    if (!html || html.trim() === '') return undefined
    const { html: cleaned, images } = extractExternalImages(html, JSDOM)
    const state = convertHTMLToLexical({ editorConfig, html: cleaned, JSDOM }) as {
      root: { children: any[] }
    }
    if (images.length) {
      const mediaIds: (PayloadID | undefined)[] = []
      for (const image of images) mediaIds.push(await ensureMedia(image.url, image.alt))
      expandImageMarkers(state.root, mediaIds)
      const leftover = stripLeftoverMarkers(state.root)
      if (leftover) {
        console.warn(
          `   ⚠️  "${label}": ブロック化できない位置の画像 ${leftover} 枚をスキップ（bookmark card のサムネイル等）`,
        )
      }
    }
    return state
  }

  // slug で findOrUpdate する冪等 upsert。
  const upsert = async (
    collection: CollectionSlug,
    data: Record<string, unknown>,
    draft?: boolean,
  ): Promise<PayloadID> => {
    const slug = data.slug as string
    const found = await payload.find({
      collection,
      where: { slug: { equals: slug } },
      limit: 1,
      depth: 0,
    })
    if (found.docs[0]) {
      const doc = await payload.update({ collection, id: found.docs[0].id, data, draft })
      summary[collection].updated += 1
      return doc.id
    }
    const doc = await payload.create({ collection, data, draft })
    summary[collection].created += 1
    return doc.id
  }

  // 1) authors
  const authorIdByGhostId = new Map<string, PayloadID>()
  for (const user of users) {
    try {
      const mapped = mapAuthor(user)
      const profileImage = await ensureMedia(mapped.profileImage, mapped.name)
      const id = await upsert('authors', { ...mapped, profileImage })
      authorIdByGhostId.set(user.id, id)
    } catch (error) {
      summary.authors.failed += 1
      console.error(`   ❌ author "${user.name}" の移行に失敗:`, (error as Error).message)
    }
  }

  // 2) tags
  const tagIdByGhostId = new Map<string, PayloadID>()
  for (const tag of tags) {
    try {
      const mapped = mapTag(tag)
      const featureImage = await ensureMedia(mapped.featureImage, mapped.name)
      const id = await upsert('tags', { ...mapped, featureImage })
      tagIdByGhostId.set(tag.id, id)
    } catch (error) {
      summary.tags.failed += 1
      console.error(`   ❌ tag "${tag.name}" の移行に失敗:`, (error as Error).message)
    }
  }

  // 3) posts（リレーションは sort_order 昇順で解決）
  const authorsByPost = buildRelationIndex(postsAuthors, 'author_id')
  const tagsByPost = buildRelationIndex(postsTags, 'tag_id')

  for (const post of migratablePosts) {
    try {
      const mapped = mapPost(post)
      const featureImage = await ensureMedia(mapped.featureImage, mapped.title)
      const content = await htmlToLexical(post.html, post.title)
      const authorIds = (authorsByPost.get(post.id) ?? [])
        .map((ghostId) => authorIdByGhostId.get(ghostId))
        .filter((id): id is PayloadID => id != null)
      const tagIds = (tagsByPost.get(post.id) ?? [])
        .map((ghostId) => tagIdByGhostId.get(ghostId))
        .filter((id): id is PayloadID => id != null)

      await upsert(
        'posts',
        { ...mapped, featureImage, content, authors: authorIds, tags: tagIds },
        mapped._status === 'draft',
      )
    } catch (error) {
      summary.posts.failed += 1
      console.error(`   ❌ post "${post.title}" の移行に失敗:`, (error as Error).message)
    }
  }

  // 4) about（Ghost の page slug=about）→ Payload Global "about"
  const aboutPage = posts.find((p) => p.slug === 'about' && (p.type ?? '') === 'page')
  if (aboutPage) {
    try {
      // __GHOST_URL__ プレースホルダは相対URLへ（例: /rss.xml）
      const html = (aboutPage.html ?? '').replace(/__GHOST_URL__/g, '')
      const content = await htmlToLexical(html, 'about')
      await payload.updateGlobal({ slug: 'about', data: { content } })
      console.log('   about: Global を更新しました')
    } catch (error) {
      console.error('   ❌ about global の更新に失敗:', (error as Error).message)
    }
  }

  console.log('\n✨ 移行完了')
  console.log(
    `   media: created=${summary.media.created} reused=${summary.media.reused} failed=${summary.media.failed}`,
  )
  for (const collection of ['authors', 'tags', 'posts'] as const) {
    const s = summary[collection]
    console.log(`   ${collection}: created=${s.created} updated=${s.updated} failed=${s.failed}`)
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
