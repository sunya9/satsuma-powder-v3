import type { Child, JSX, PropsWithChildren } from "hono/jsx";
import { cn } from "#lib/util";
import { formatDate } from "#lib/date";

interface Props {
  coverImage?: string | null;
}

export function AppHeader({ coverImage, children }: PropsWithChildren<Props>) {
  // http(s) only; escape url()/declaration-breaking chars (CSS-injection safe).
  const safeCover =
    coverImage && /^https?:\/\//i.test(coverImage)
      ? coverImage.replace(/[;"'()\\\s]/g, encodeURIComponent)
      : undefined;
  const hasCover = !!safeCover;
  return (
    <header
      class={cn(
        " h-[clamp(--spacing(64),30vw,--spacing(128))] flex-col place-content-center",
        {
          "bg-center bg-no-repeat bg-cover text-white from-black/30 to-black/80":
            hasCover,
          [cn(
            "bg-ink/0.5 inset-shadow-paper inset-shadow-sm border-b-line border-b",
            "[--dot-size:2px] [--dot-space:24px] [--dot-color:rgb(from_var(--color-ink)_r_g_b/5%)]",
            "bg-[radial-gradient(rgb(from_var(--color-paper)_r_g_b/5%),var(--color-paper)),radial-gradient(circle,var(--dot-color)_var(--dot-size),transparent_var(--dot-size)),radial-gradient(circle,var(--dot-color)_var(--dot-size),transparent_var(--dot-size))]",
            "bg-size-[contain,var(--dot-space)_var(--dot-space),var(--dot-space)_var(--dot-space)]",
            "bg-position-[center,0_0,calc(var(--dot-space)/2)_calc(var(--dot-space)/2)]",
          )]: !hasCover,
        },
      )}
      style={{
        backgroundImage:
          safeCover &&
          "linear-gradient(var(--tw-gradient-from), var(--tw-gradient-to)), var(--safe-cover)",
        "--safe-cover": safeCover && `url(${safeCover})`,
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
        "mb-4 text-[clamp(var(--text-2xl),3vw,var(--text-4xl))] leading-tight [word-break:auto-phrase]",
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
      class="mt-2 inline-block rounded-full px-4 py-1 text-sm border border-[color-mix(in_srgb,currentColor_40%,transparent)]"
    >
      {formatDate(date)}
    </time>
  );
}
