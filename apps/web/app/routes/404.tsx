import { createRoute } from 'honox/factory'
import { AppLayout } from '../components/AppLayout'

// Built to dist/404.html; Cloudflare Pages serves it for unknown paths.
export default createRoute((c) =>
  c.render(
    <AppLayout header={{ title: 'ページが見つかりません' }}>
      <p>お探しのページは見つかりませんでした。</p>
    </AppLayout>,
    { title: 'ページが見つかりません' },
  ),
)
