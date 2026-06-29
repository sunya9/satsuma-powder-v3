import { cn } from "#lib/util";
import type { JSX, PropsWithChildren } from "hono/jsx";

export function LinkButton({
  class: className,
  children,
  ...props
}: PropsWithChildren<JSX.IntrinsicElements["a"]>) {
  return (
    <a
      {...props}
      class={cn(
        "inline-block border border-accent py-2 px-4 no-underline text-accent hover:text-accent/70 hover:border-accent/70",
        className,
      )}
    >
      {children}
    </a>
  );
}
