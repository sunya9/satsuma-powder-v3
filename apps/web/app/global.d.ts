import type {} from "hono";
import type { Properties } from "csstype";

// Injected by the worker vite build (see vite.config.ts): the hashed href of the
// built stylesheet, so the preview page loads the same CSS as the static site.
// This file is a module (it imports), so the const must go through `declare global`.
declare global {
  const __STYLE_HREF__: string;
}

declare module "hono" {
  interface Env {
    Variables: {};
    Bindings: {};
  }
  interface ContextRenderer {
    (
      children: unknown,
      props?: {
        title?: string;
        description?: string;
        path?: string;
        image?: string;
        type?: string;
      },
    ): Response | Promise<Response>;
  }
}

declare module "hono/jsx" {
  export namespace JSX {
    export interface CSSProperties extends Properties {
      [key: `--${string}`]: string | Promise<string> | undefined;
      viewTransitionName?: string | undefined;
    }
  }
}
