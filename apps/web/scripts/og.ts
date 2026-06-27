import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { Resvg } from '@resvg/resvg-js'
import satori from 'satori'
import { formatDate } from '../app/lib/date'

const PAYLOAD_URL = (process.env.VITE_PAYLOAD_URL ?? 'http://localhost:3000').replace(/\/$/, '')
const SITE_URL = (process.env.VITE_SITE_URL ?? 'http://localhost:5173').replace(/\/$/, '')
const SITE_TITLE = '粉蜜柑。'
const SITE_DESC = '小学生でももうちょっとマシな感想言う。'
const ICON_URL =
  'https://firebasestorage.googleapis.com/v0/b/sunya9-blog.appspot.com/o/assets%2F2021%2F12%2FProfileImage4-circle-ghost.png?generation=1639172821700900&alt=media'
const DIST = join(import.meta.dirname, '..', 'dist')

// Google Fonts css2 with text= returns a truetype subset (satori cannot read woff2).
async function loadFontSubset(family: string, text: string): Promise<ArrayBuffer> {
  const url = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}&text=${encodeURIComponent(text)}`
  const css = await (await fetch(url)).text()
  const match = css.match(/src:\s*url\(([^)]+)\)\s*format\(['"]?truetype['"]?\)/)
  if (!match) throw new Error(`No truetype subset for "${text.slice(0, 20)}…"`)
  return (await fetch(match[1])).arrayBuffer()
}

async function fetchDataUri(url: string): Promise<string> {
  const res = await fetch(url)
  const mime = res.headers.get('content-type') ?? 'image/png'
  const base64 = Buffer.from(await res.arrayBuffer()).toString('base64')
  return `data:${mime};base64,${base64}`
}

type El = { type: string; props: Record<string, unknown> }
const h = (type: string, style: Record<string, unknown>, children?: unknown): El => ({
  type,
  props: children === undefined ? { style } : { style, children },
})

function template(opts: { title: string; subtitle: string; icon: string }): El {
  return h(
    'div',
    {
      width: '100%',
      height: '100%',
      display: 'flex',
      padding: 28,
      backgroundColor: '#fffffc',
      fontFamily: 'Noto Sans JP',
      color: '#2f2725',
    },
    [
      h(
        'div',
        {
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          border: '2px solid #27120a',
          padding: 64,
        },
        [
          h('div', { display: 'flex', alignItems: 'center' }, [
            {
              type: 'img',
              props: { src: opts.icon, width: 88, height: 88, style: { borderRadius: '50%' } },
            },
            h('div', { marginLeft: 24, fontSize: 34, color: '#27120a' }, SITE_TITLE),
          ]),
          h('div', { display: 'flex', fontSize: 60, lineHeight: 1.25, color: '#27120a' }, opts.title),
          h('div', { display: 'flex', fontSize: 30, color: '#4e4449' }, opts.subtitle),
        ],
      ),
    ],
  )
}

async function renderPng(opts: { title: string; subtitle: string; icon: string }): Promise<Buffer> {
  const font = await loadFontSubset('Noto Sans JP', SITE_TITLE + opts.title + opts.subtitle)
  const svg = await satori(template(opts) as never, {
    width: 1200,
    height: 630,
    fonts: [{ name: 'Noto Sans JP', data: font, weight: 400, style: 'normal' }],
  })
  return Buffer.from(new Resvg(svg).render().asPng())
}

async function write(routePath: string, png: Buffer) {
  // routePath is extensionless to match the og:image meta; _headers sets Content-Type.
  const file = join(DIST, routePath)
  await mkdir(dirname(file), { recursive: true })
  await writeFile(file, png)
}

async function main() {
  const icon = await fetchDataUri(ICON_URL)

  await write('opengraph-image', await renderPng({ title: SITE_TITLE, subtitle: SITE_DESC, icon }))

  const res = await fetch(`${PAYLOAD_URL}/api/posts?depth=0&limit=1000&sort=-publishedAt`)
  const { docs } = (await res.json()) as {
    docs: { slug: string; title: string; publishedAt?: string | null }[]
  }

  const limit = Number(process.env.OG_LIMIT ?? docs.length)
  let done = 0
  for (const post of docs.slice(0, limit)) {
    const subtitle = post.publishedAt ? formatDate(post.publishedAt) : ''
    const png = await renderPng({ title: post.title, subtitle, icon })
    await write(`blog/${post.slug}/opengraph-image`, png)
    done += 1
  }
  console.log(`OG images: 1 site + ${done} posts → ${SITE_URL}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
