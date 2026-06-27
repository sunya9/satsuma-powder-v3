import { formatDate } from '../lib/date'
import { getSite } from '../lib/payload'

interface Props {
  coverImage?: string | null
  header?: { title?: string; description?: string | null; date?: string | null }
  children?: unknown
}

const PILL = 'inline-block rounded-full px-4 py-1 text-sm border border-[color-mix(in_srgb,currentColor_40%,transparent)]'

export async function AppLayout({ coverImage, header, children }: Props) {
  const site = await getSite()
  // Allow only http(s) and strip url()-breaking chars (CSS injection defense).
  const safeCover =
    coverImage && /^https?:\/\//i.test(coverImage)
      ? coverImage.replace(/["'()\\\s]/g, encodeURIComponent)
      : undefined
  const hasCover = Boolean(safeCover)
  const nocover = !hasCover && Boolean(header)

  return (
    <>
      <header
        class={[
          'bg-center bg-no-repeat bg-cover py-[7vw]',
          hasCover ? 'text-white' : '',
          nocover ? 'header-grid' : '',
        ].join(' ')}
        style={
          hasCover
            ? `background-image: linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.8)), url("${safeCover}")`
            : undefined
        }
      >
        <div class="site-container">
          {!header ? (
            <>
              <h1 class="mb-4 text-[clamp(1.5rem,3vw,2.666rem)] leading-tight">{site.title}</h1>
              <p>{site.description}</p>
            </>
          ) : (
            <>
              <h1 class="mb-4 text-[clamp(1.5rem,3vw,2.666rem)] leading-tight">{header.title}</h1>
              {header.description && <p>{header.description}</p>}
              {header.date && (
                <time datetime={header.date} class={PILL}>
                  {formatDate(header.date)}
                </time>
              )}
            </>
          )}
        </div>
      </header>

      <main class="my-12">
        <div class="site-container">{children}</div>
      </main>

      <footer class="my-20 text-muted">
        <div class="site-container">
          {header && (
            <p>
              <a class="button" href="/">
                ホームに戻る
              </a>
            </p>
          )}
          <p>
            ©&nbsp;
            <a class="text-accent hover:text-accent/60" href={`https://twitter.com/${site.twitterHandle}`}>
              @{site.twitterHandle}
            </a>
          </p>
        </div>
      </footer>
    </>
  )
}
