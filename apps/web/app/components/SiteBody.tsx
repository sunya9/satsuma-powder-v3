import type { PropsWithChildren } from "hono/jsx";
import type { Site } from "#lib/payload";
import { LinkButton } from "#components/LinkButton";
import { Hr } from "#components/Hr";

// The shared <body> chrome (page content + site footer) used by both the
// published renderer (_renderer.tsx) and the draft preview (worker.tsx), so a
// preview matches the real page below the differing <head>.
export function SiteBody({
  site,
  isIndex,
  children,
}: PropsWithChildren<{ site: Site; isIndex?: boolean }>) {
  return (
    <body class="bg-paper text-ink">
      {children}
      <footer class="my-20 text-muted">
        <div class="site-container space-y-4">
          {!isIndex && (
            <p>
              <LinkButton href="/">ホームに戻る</LinkButton>
            </p>
          )}
          <Hr />
          <p>
            ©&nbsp;
            <a
              class="text-link"
              href={`https://twitter.com/${site.twitterHandle}`}
            >
              @{site.twitterHandle}
            </a>
          </p>
        </div>
      </footer>
    </body>
  );
}
