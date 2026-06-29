import type { Child, JSX, PropsWithChildren } from "hono/jsx";
import { cn } from "#lib/util";

export function AppHeader({ children }: PropsWithChildren) {
  return (
    <header
      class={cn(
        " h-[clamp(--spacing(64),30vw,--spacing(128))] flex-col place-content-center",
        "bg-ink/0.5 inset-shadow-paper inset-shadow-sm border-b-line border-b",
        "[--dot-size:2px] [--dot-space:24px] [--dot-color:rgb(from_var(--color-ink)_r_g_b/5%)]",
        "bg-[radial-gradient(rgb(from_var(--color-paper)_r_g_b/5%),var(--color-paper)),radial-gradient(circle,var(--dot-color)_var(--dot-size),transparent_var(--dot-size)),radial-gradient(circle,var(--dot-color)_var(--dot-size),transparent_var(--dot-size))]",
        "bg-size-[contain,var(--dot-space)_var(--dot-space),var(--dot-space)_var(--dot-space)]",
        "bg-position-[center,0_0,calc(var(--dot-space)/2)_calc(var(--dot-space)/2)]",
      )}
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
        "mb-4 text-[clamp(var(--text-2xl),3vw,var(--text-4xl))] leading-tight [word-break:auto-phrase] text-balance",
        className,
      )}
      {...props}
    >
      {children}
    </h1>
  );
}
