import { ssgParams } from "hono/ssg";
import { type AppEnv, createRoute } from "#lib/app-env";
import { formatDate } from "#lib/date";
import { ogPng } from "#lib/og";

export default createRoute(
  ssgParams<AppEnv>(async (c) => {
    const posts = await c.var.payload.getPosts();
    return posts.map((post) => ({ slug: post.slug }));
  }),
  async (c) => {
    const slug = c.req.param("slug");
    if (!slug) return c.notFound();
    const post = await c.var.payload.getPost(slug);
    if (!post) return c.notFound();
    const [site, posts] = await Promise.all([c.var.payload.getSite(), c.var.payload.getPosts()]);
    const png = await ogPng({
      title: post.title,
      subtitle: post.publishedAt ? formatDate(post.publishedAt) : "",
      site,
      posts,
    });
    return new Response(png, { headers: { "Content-Type": "image/png" } });
  },
);
