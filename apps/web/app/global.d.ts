import type {} from "hono";
import type { Properties } from "csstype";

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
