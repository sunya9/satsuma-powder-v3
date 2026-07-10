import type { NotFoundHandler } from "hono";
import { NotFound, NOT_FOUND_TITLE } from "#components/NotFound";

// Runtime not-found (dev server / honox runtime). Mirrors the SSG 404 page.
const handler: NotFoundHandler = (c) => {
  c.status(404);
  return c.render(<NotFound />, { title: NOT_FOUND_TITLE });
};

export default handler;
