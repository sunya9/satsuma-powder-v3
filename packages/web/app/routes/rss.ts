import { createRoute } from 'honox/factory'

// 旧 Ghost の /rss を維持（/rss.xml へ恒久リダイレクト）。
export default createRoute((c) => c.redirect('/rss.xml', 301))
