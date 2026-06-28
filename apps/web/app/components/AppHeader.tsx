import type { Child, JSX, PropsWithChildren } from "hono/jsx";
import { cn } from "#lib/util";
import { formatDate } from "#lib/date";
import type { HtmlAttributes } from "csstype";

interface Props {
  coverImage?: string | null;
}

export function AppHeader({ coverImage, children }: PropsWithChildren<Props>) {
  const hasCover = !!coverImage;
  const safeCover = coverImage?.replace(/["'()\\\s]/g, encodeURIComponent)

  return (
    <header
      class={cn("bg-center bg-no-repeat bg-cover py-[7vw] bg-", {
        "text-white": hasCover,
        "header-grid": !hasCover,
      })}
      style={{
        // backgroundImage: "linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.8)), url(var(--safe-cover))",
        "--safe-cover": coverImage || undefined,
      }}
    >
      <div class="site-container">{children}</div>
    </header>
  );
}

export function AppHeaderTitle({
  children,
  class: className,
  ...props
}: PropsWithChildren & JSX.HTMLAttributes) {
  return (
    <h1
      class={cn(
        "mb-4 text-[clamp(1.5rem,3vw,2.666rem)] leading-tight",
        className,
      )}
      {...props}
    >
      {children}
    </h1>
  );
}

export function AppHeaderTime({ date }: { date: string }) {
  return (
    <time
      datetime={date}
      class="inline-block rounded-full px-4 py-1 text-sm border border-[color-mix(in_srgb,currentColor_40%,transparent)]"
    >
      {formatDate(date)}
    </time>
  );
}
