// One-shot Ghost-export -> Payload migration (Local API).
//   pnpm migrate:ghost [--dry-run]   |   GHOST_EXPORT=path/to/export.json pnpm migrate:ghost
//
// All images (feature / author / inline <img>) are downloaded into the media collection so the
// site no longer depends on external URLs (storage adapter points media at R2 in production).
// Idempotent: media deduped by sourceUrl, entities upserted by slug.
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

// convertHTMLToLexical turns <img> into an upload node whose value is empty (no media doc yet),
// which fails validation. So replace each <img> with a marker, ingest the image, then restore
// the marker as an upload node referencing the created media.
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

// Expand root-level markers into upload nodes, splitting paragraphs around inline images.
// Markers whose media failed to resolve are dropped.
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

// Strip markers that couldn't be promoted to root level (e.g. thumbnails inside bookmark cards).
function stripLeftoverMarkers(node: any): number {
  let count = 0
  if (node.type === 'text' && typeof node.text === 'string' && MARKER_RE.test(node.text)) {
    count += (node.text.match(/@@EXTIMG_\d+@@/g) ?? []).length
    node.text = node.text.replace(/@@EXTIMG_\d+@@/g, '').trim()
  }
  for (const child of node.children ?? []) count += stripLeftoverMarkers(child)
  return count
}

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

  // Download an external image into media, deduped by sourceUrl; returns its media id.
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

  // authors
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

  // tags
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

  // posts
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

  // about: Ghost page (slug=about) -> about Global
  const aboutPage = posts.find((p) => p.slug === 'about' && (p.type ?? '') === 'page')
  if (aboutPage) {
    try {
      // __GHOST_URL__ placeholder -> relative URL (e.g. /rss.xml)
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
