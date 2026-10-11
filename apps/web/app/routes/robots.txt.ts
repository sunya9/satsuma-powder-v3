import { createRoute } from "#lib/app-env";

export default createRoute((c) =>
  c.body(`User-agent: *\nAllow: /\n\nSitemap: ${c.var.env.siteUrl}/sitemap.xml\n`, 200, {
    "Content-Type": "text/plain; charset=utf-8",
  }),
);
