import type {} from 'hono'

declare module 'hono' {
  interface Env {
    Variables: {}
    Bindings: {}
  }
  interface ContextRenderer {
    (
      children: unknown,
      props?: {
        title?: string
        description?: string
        path?: string
        image?: string
        type?: string
      },
    ): Response | Promise<Response>
  }
}
