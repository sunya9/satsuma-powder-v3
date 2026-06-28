import { createRoute } from "honox/factory";
import { AppHeader, AppHeaderTitle } from "#components/AppHeader";
import { AppMain } from "#components/AppMain";

// Built to dist/404.html; Cloudflare Pages serves it for unknown paths.
export default createRoute((c) =>
  c.render(
    <>
      <AppHeader>
        <AppHeaderTitle>ページが見つかりません</AppHeaderTitle>
      </AppHeader>
      <AppMain>
        <p>お探しのページは見つかりませんでした。</p>
      </AppMain>
    </>,
    { title: "ページが見つかりません" },
  ),
);
