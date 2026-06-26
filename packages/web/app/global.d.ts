import type {} from 'hono'

declare module 'hono' {
  interface Env {
    Variables: {}
    Bindings: {}
  }
  // _renderer.tsx に渡す c.render の追加プロップ
  interface ContextRenderer {
    (
      children: unknown,
      props?: {
        title?: string
        description?: string
        /** canonical / og:url 用のパス（例: "/blog/foo"）。 */
        path?: string
        /** og:image の絶対URL。 */
        image?: string
        /** og:type（website | article）。 */
        type?: string
      },
    ): Response | Promise<Response>
  }
}
