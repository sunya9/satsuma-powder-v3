import { AppHeader, AppHeaderTitle } from "#components/AppHeader";
import { AppMain } from "#components/AppMain";
import { LinkButton } from "#components/LinkButton";

// Shared "page not found" body so the SSG 404 page (routes/404.tsx) and the
// runtime not-found handler (routes/_404.tsx) render the same design.
export const NOT_FOUND_TITLE = "ページが見つかりません";

export function NotFound() {
  return (
    <>
      <AppHeader>
        <AppHeaderTitle>{NOT_FOUND_TITLE}</AppHeaderTitle>
      </AppHeader>
      <AppMain class="space-y-8">
        <p>
          お探しのページは見つかりませんでした。良かったらサイト内で探してみてください。
        </p>
        <LinkButton href="/">トップに戻る</LinkButton>
      </AppMain>
    </>
  );
}
