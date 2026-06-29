import { cn } from "#lib/util.js";
import type { PropsWithChildren } from "hono/jsx";

export function AppMain({
  class: className,
  children,
}: PropsWithChildren<{ class?: string }>) {
  return <main class={cn("my-12 site-container", className)}>{children}</main>;
}
