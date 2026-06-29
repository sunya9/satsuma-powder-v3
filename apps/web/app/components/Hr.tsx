import { cn } from "#lib/util";
import type { JSX } from "hono/jsx";

export function Hr({ class: className, props }: JSX.IntrinsicElements["hr"]) {
  return (
    <hr
      {...props}
      class={cn("my-8 border-line border-t-3 border-double", className)}
    />
  );
}
