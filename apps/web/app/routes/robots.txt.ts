import { createRoute } from 'honox/factory'
import { config } from '../lib/config'

export default createRoute((c) =>
  c.body(`User-agent: *\nAllow: /\n\nSitemap: ${config.url}/sitemap.xml\n`, 200, {
    'Content-Type': 'text/plain; charset=utf-8',
  }),
)
