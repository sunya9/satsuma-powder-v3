import { Resvg } from '@resvg/resvg-js'
import satori from 'satori'
import { getSite } from './payload'

let iconPromise: Promise<string | undefined> | undefined
function iconDataUri(url?: string): Promise<string | undefined> {
  iconPromise ??= (async () => {
    if (!url) return undefined
    const res = await fetch(url)
    const mime = res.headers.get('content-type') ?? 'image/png'
    return `data:${mime};base64,${Buffer.from(await res.arrayBuffer()).toString('base64')}`
  })()
  return iconPromise
}

// Google Fonts css2 with text= returns a truetype subset (satori cannot read woff2).
async function loadFontSubset(text: string): Promise<ArrayBuffer> {
  const url = `https://fonts.googleapis.com/css2?family=Noto+Sans+JP&text=${encodeURIComponent(text)}`
  const css = await (await fetch(url)).text()
  const match = css.match(/src:\s*url\(([^)]+)\)\s*format\(['"]?truetype['"]?\)/)
  if (!match) throw new Error(`No truetype subset for "${text.slice(0, 20)}…"`)
  return (await fetch(match[1])).arrayBuffer()
}

type El = { type: string; props: Record<string, unknown> }
const h = (type: string, style: Record<string, unknown>, children?: unknown): El => ({
  type,
  props: children === undefined ? { style } : { style, children },
})

function template(opts: { siteTitle: string; title: string; subtitle: string; icon?: string }): El {
  const header: unknown[] = []
  if (opts.icon)
    header.push({
      type: 'img',
      props: { src: opts.icon, width: 88, height: 88, style: { borderRadius: '50%' } },
    })
  header.push(h('div', { marginLeft: 24, fontSize: 34, color: '#27120a' }, opts.siteTitle))

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
          h('div', { display: 'flex', alignItems: 'center' }, header),
          h('div', { display: 'flex', fontSize: 60, lineHeight: 1.25, color: '#27120a' }, opts.title),
          h('div', { display: 'flex', fontSize: 30, color: '#4e4449' }, opts.subtitle),
        ],
      ),
    ],
  )
}

export async function ogPng(opts: { title: string; subtitle: string }): Promise<Uint8Array> {
  const site = await getSite()
  const icon = await iconDataUri(site.iconUrl)
  const font = await loadFontSubset(site.title + opts.title + opts.subtitle)
  const svg = await satori(
    template({ siteTitle: site.title, title: opts.title, subtitle: opts.subtitle, icon }) as never,
    { width: 1200, height: 630, fonts: [{ name: 'Noto Sans JP', data: font, weight: 400, style: 'normal' }] },
  )
  return new Resvg(svg).render().asPng()
}
