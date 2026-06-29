import { createRoute } from "honox/factory";
import { AppHeader, AppHeaderTitle } from "#components/AppHeader";
import { AppMain } from "#components/AppMain";
import { LinkButton } from "#components/LinkButton.js";

// Built to dist/404.html; Cloudflare Pages serves it for unknown paths.
export default createRoute((c) =>
  c.render(
    <>
      <AppHeader>
        <AppHeaderTitle>ページが見つかりません</AppHeaderTitle>
      </AppHeader>
      <AppMain class="space-y-8">
        <p>
          お探しのページは見つかりませんでした。良かったらサイト内で探してみてください。
        </p>
        <LinkButton href="/">トップに戻る</LinkButton>
      </AppMain>
    </>,
    { title: "ページが見つかりません" },
  ),
);
