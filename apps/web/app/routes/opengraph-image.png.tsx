import { createRoute } from "#lib/app-env";
import { ogPng } from "#lib/og";

export default createRoute(async (c) => {
  const [site, posts] = await Promise.all([c.var.payload.getSite(), c.var.payload.getPosts()]);
  const png = await ogPng({ title: site.title, subtitle: site.description, site, posts });
  return new Response(png, { headers: { "Content-Type": "image/png" } });
});
