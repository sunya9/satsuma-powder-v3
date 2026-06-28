import type { PropsWithChildren } from "hono/jsx";

export function AppMain({ children }: PropsWithChildren) {
  return (
    <main class="my-12">
      <div class="site-container">{children}</div>
    </main>
  );
}
